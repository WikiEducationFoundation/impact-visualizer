# frozen_string_literal: true

class ClassificationService
  attr_accessor :topic, :wiki, :wiki_action_api

  def initialize(topic:)
    @topic = topic
    @wiki = topic.wiki
    @wiki_action_api = WikiActionApi.new(@wiki)
  end

  def classify_all_articles
    article_bag_articles = @topic.active_article_bag.article_bag_articles
    article_bag_articles.each do |article_bag_article|
      article = article_bag_article.article
      classify_article(article:)
    end
  end

  def classify_article(article:)
    claims = @wiki_action_api.get_wikidata_claims(article.title)
    return unless claims.present?

    @topic.classifications.each do |classification|
      prerequisites = classification.prerequisites.to_hashugar
      properties = classification.properties.to_hashugar

      # See if article meets prerequisites for classification
      matched = claims_meet_prerequisites?(claims:, prerequisites:)

      # Grab existing classification for Article
      existing = ArticleClassification.find_by(classification:, article:)

      if matched
        # Prep properties to capture
        properties = properties_from_claims(claims:, properties:)

        # Update existing or create new
        if existing
          existing.update(properties:)
        else
          ArticleClassification.create!(classification:, article:, properties:)
        end
      elsif existing
        # Delete the existing ArticleClassification, it no longer matches
        existing.destroy
      end
    end
  end

  def claims_meet_prerequisites?(claims:, prerequisites:)
    all_matched = false

    prerequisites.each do |prerequisite|
      prerequisite_matched = false
      property_id = prerequisite[:property_id]
      value_ids = prerequisite[:value_ids]

      # Get the matched property object
      begin
        matched_property = claims[property_id]
      rescue StandardError => e
        ap claims
        raise e
      end

      # Check match on value_ids, if needed
      if matched_property && value_ids.present?
        claim_value_ids = extract_claim_value_ids(matched_property)
        prerequisite_matched = value_ids.intersection(claim_value_ids).present?
      else
        prerequisite_matched = matched_property.present?
      end

      # If prerequisite is required and missing, break out of loop
      if prerequisite[:required] && !prerequisite_matched
        all_matched = false
        break
      end

      # Update matched, but don't set to false
      all_matched ||= prerequisite_matched
    end

    all_matched
  end

  def properties_from_claims(claims:, properties:)
    captured_properties = []
    properties.each do |property|
      property_id = property[:property_id]
      matched_property = claims[property_id]
      value_ids = extract_claim_value_ids(matched_property)
      next unless value_ids.present?
      captured_properties << {
        name: property[:name],
        slug: property[:slug],
        property_id:,
        value_ids:
      }
    end
    captured_properties
  end

  def extract_claim_value_ids(claim)
    return [] unless claim.is_a?(Array)
    value_ids = []
    claim.each do |prop|
      id = prop.dig('mainsnak', 'datavalue', 'value', 'id')
      value_ids << id if id.present?
    end
    value_ids
  end

  def summarize_topic_timepoint(topic_timepoint:)
    raise ImpactVisualizerErrors::InvalidTimepointForTopic unless topic_timepoint.topic == @topic

    classifications = @topic.classifications
    summary = []

    # Process each classification associated with Topic
    classifications.each do |classification|
      summary << classification_summary_for_topic_timepoint(
        classification:,
        topic_timepoint:
      )
    end

    summary
  end

  def classification_summary_for_topic_timepoint(classification:, topic_timepoint:)
    # Grab count of articles with classification at topic_timepoint
    count = Queries.topic_timepoint_classification_count(
      topic_timepoint_id: topic_timepoint.id,
      classification_id: classification.id
    )

    properties = []

    # Summarize classification properties
    classification.properties.each do |property|
      segments = segment_summary_for_property(
        property:, classification:, topic_timepoint:
      )

      property_summary = {
        name: property['name'],
        slug: property['slug'],
        property_id: property['property_id'],
        translate_segment_keys: get_translate_segment_keys(property:),
        segments:
      }

      properties << property_summary
    end

    {
      id: classification.id,
      name: classification.name,
      count:,
      properties:
    }
  end

  def get_translate_segment_keys(property:)
    return false unless property['segments']
    return true if property['segments'] == true
    false
  end

  def segment_summary_for_property(property:, classification:, topic_timepoint:)
    return false unless property['segments']

    # Get property values for all classified articles at timepoint
    value_rows = Queries.topic_timepoint_classification_values_for_property(
      topic_timepoint_id: topic_timepoint.id,
      classification_id: classification.id,
      property_id: property['property_id']
    )

    return segment_by_value(value_rows:) if property['segments'] == true
    segment_by_group(value_rows:, property:)
  end

  def segment_by_value(value_rows:)
    segments = {}

    # Count up total of each value_id
    value_rows.each do |value_row|
      value_ids = JSON.parse(value_row[0])
      value_count = value_row[1]
      next unless value_ids.count.positive? && value_count.positive?
      value_ids.each do |value_id|
        if segments[value_id]
          segments[value_id] = segments[value_id] + value_count
          next
        end
        segments[value_id] = value_count
      end
    end

    segments
  end

  def segment_by_group(value_rows:, property:)
    property_segments = property['segments']
    return false unless property_segments.is_a?(Array)

    default_segment_key = nil
    segments = {}

    # Prep the segment key/counts
    property_segments.each do |property_segment|
      segments[property_segment['label']] = 0
      default_segment_key = property_segment['label'] if property_segment['default']
    end

    # Bail if no "default"
    return false unless default_segment_key

    # Handle each set of value_ids
    value_rows.each do |value_row|
      value_ids = JSON.parse(value_row[0])
      value_count = value_row[1]
      next unless value_ids.count.positive? && value_count.positive?

      # Handle each value_id in set
      value_ids.each do |value_id|
        matched_segment_key = nil

        # Find the matching segment
        property_segments.each do |property_segment|
          next unless property_segment['value_ids']&.include?(value_id)
          matched_segment_key = property_segment['label']
          break
        end

        # If no match found, use default
        matched_segment_key ||= default_segment_key

        # Increment the count
        segments[matched_segment_key] = segments[matched_segment_key] + value_count
      end
    end

    segments
  end
end
