# frozen_string_literal: true

class ClassificationService
  attr_accessor :topic, :wiki, :wiki_action_api, :top_value_count

  def initialize(topic:)
    @topic = topic
    @wiki = topic.wiki
    @top_value_count = 19
    @wiki_action_api = WikiActionApi.new(@wiki)
    @wikidata_translator = WikidataTranslator.new(wiki: @wiki)
  end

  def classify_all_articles(&block)
    article_bag_articles = @topic.active_article_bag.article_bag_articles
    article_bag_articles.each do |article_bag_article|
      yield if block
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

  def summarize_topic
    classifications = @topic.classifications
    summary = []

    # Process each classification associated with Topic
    classifications.each do |classification|
      summary << classification_summary_for_topic(classification:)
    end

    summary
  end

  def classification_summary_for_topic(classification:)
    count = Queries.article_bag_classification_count(classification_id: classification.id,
                                                     article_bag_id: @topic.active_article_bag.id)
    summary = {
      id: classification.id,
      name: classification.name,
      count:,
      properties: classification.properties
    }
    summary
  end

  def summarize_topic_timepoint(topic_timepoint:, previous_topic_timepoint: nil)
    raise ImpactVisualizerErrors::InvalidTimepointForTopic unless topic_timepoint.topic == @topic

    classifications = @topic.classifications
    summary = []

    # Process each classification associated with Topic
    classifications.each do |classification|
      summary << classification_summary_for_topic_timepoint(
        classification:,
        topic_timepoint:,
        previous_topic_timepoint:
      )
    end

    summary
  end

  def classification_summary_for_topic_timepoint(classification:, topic_timepoint:,
                                                 previous_topic_timepoint: nil)
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
        segments:
      }

      properties << property_summary
    end

    counts = calculate_classification_counts(classification:, topic_timepoint:,
                                             previous_topic_timepoint:)

    properties = calculate_property_deltas(classification:, properties:,
                                           previous_topic_timepoint:)

    summary = {
      id: classification.id,
      name: classification.name,
      properties:
    }

    summary.merge(counts)
  end

  def calculate_classification_counts(classification:, topic_timepoint:,
                                      previous_topic_timepoint: nil)
    # Grab counts of articles with classification at topic_timepoint
    counts = Queries.topic_timepoint_classification_count(
      topic_timepoint_id: topic_timepoint.id,
      classification_id: classification.id
    )

    # Extract counts
    count = counts[:count]
    revisions_count = counts[:revisions_count]
    token_count = counts[:token_count]

    # Calculate deltas
    count_delta = 0
    revisions_count_delta = 0
    token_count_delta = 0

    if previous_topic_timepoint
      previous_classification = previous_topic_timepoint.classifications.find do |c|
        c['id'] == classification.id
      end
      previous_count = previous_classification['count'] || 0
      count_delta = count - previous_count

      previous_revisions_count = previous_classification['revisions_count'] || 0
      revisions_count_delta = revisions_count - previous_revisions_count

      previous_token_count = previous_classification['token_count'] || 0
      token_count_delta = token_count - previous_token_count
    end

    # Get WP10 counts
    wp10_prediction_categories = wp10_for_classification_timepoint(classification:,
                                                                   topic_timepoint:)

    {
      count:,
      count_delta:,
      revisions_count:,
      revisions_count_delta:,
      token_count:,
      token_count_delta:,
      wp10_prediction_categories:
    }
  end

  def wp10_for_classification_timepoint(classification:, topic_timepoint:)
    categories = Queries.wp10_categories_for_classification_timepoint(
      classification_id: classification.id,
      topic_timepoint_id: topic_timepoint.id
    )

    output = {}

    categories.each do |category|
      next unless category['category']
      next unless category['count'].positive?
      output[category['category']] = category['count']
    end

    output
  end

  def calculate_property_deltas(classification:, properties:, previous_topic_timepoint: nil)
    # Return unchanged properties if no previous_topic_timepoint
    return properties unless previous_topic_timepoint

    # Find the corresponding previous classification, based on Classification ID
    previous_classification = previous_topic_timepoint.classifications.find do |c|
      c['id'] == classification.id
    end
    return properties unless previous_classification

    # Grab the previous properties and bail if missing
    previous_properties = previous_classification['properties']
    return properties unless previous_properties

    # For each of the properties, calculate a delta against previous_topic_timepoint
    properties.each do |property|
      next unless property[:segments]

      previous_property = previous_properties.find do |p|
        p['slug'] == property[:slug]
      end

      next unless previous_property

      previous_segments = previous_property['segments']

      next unless previous_segments

      property[:segments].each do |segment_key, segment_value|
        previous_segment = previous_segments[segment_key]
        previous_segment ||= previous_segments['other']
        next unless previous_segment
        previous_count = previous_segment['count'] || 0
        segment_value[:count_delta] = segment_value[:count] - previous_count

        previous_revisions_count = previous_segment['revisions_count'] || 0
        segment_value[:revisions_count_delta] = segment_value[:revisions_count] - previous_revisions_count

        previous_token_count = previous_segment['token_count'] || 0
        segment_value[:token_count_delta] = segment_value[:token_count] - previous_token_count
      end
    end

    # Return the new properties
    properties
  end

  def segment_summary_for_property(property:, classification:, topic_timepoint:)
    return false unless property['segments']

    # Get property values for all classified articles at timepoint
    property_counts = Queries.topic_timepoint_classification_values_for_property(
      topic_timepoint_id: topic_timepoint.id,
      classification_id: classification.id,
      property_id: property['property_id']
    )

    if property['segments'] == true
      return segment_by_value(property_counts:, property:, classification:)
    end

    segment_by_group(property_counts:, property:)
  end

  def segment_by_value(property_counts:, property:, classification:)
    # Get top values across all timepoints
    top_values = property_value_summary(
      classification:,
      property_id: property['property_id'],
      count: @top_value_count
    )

    # Count values for timepoint
    counted_values = count_values(property_counts:)

    # Setup segments hash with "other"
    segments = {
      'other' => {
        count: 0, count_delta: 0,
        revisions_count: 0, revisions_count_delta: 0,
        token_count: 0, token_count_delta: 0
      }
    }

    # Push each of the top values into segments
    top_values.each do |top_value|
      segments[top_value] = {
        count: 0, count_delta: 0,
        revisions_count: 0, revisions_count_delta: 0,
        token_count: 0, token_count_delta: 0
      }
    end

    # Increment counts
    counted_values.each do |key, value|
      segment = segments[key] ? segments[key] : segments['other']
      segment[:count] += value[:count]
      segment[:revisions_count] += value[:revisions_count]
      segment[:token_count] += value[:token_count]
    end

    # Add labels
    @wikidata_translator.preload(ids: top_values)
    segments.each do |segment|
      label = @wikidata_translator.translate(segment[0])
      segment[1][:label] = label.titleize
    end

    segments
  end

  def segment_by_group(property_counts:, property:)
    property_segments = property['segments']
    return false unless property_segments.is_a?(Array)

    default_segment_key = nil
    segments = {}

    # Prep the segment key/counts
    property_segments.each do |property_segment|
      segments[property_segment['key']] = {
        count: 0,
        count_delta: 0,
        revisions_count: 0,
        revisions_count_delta: 0,
        token_count: 0,
        token_count_delta: 0,
        label: property_segment['label']
      }
      default_segment_key = property_segment['key'] if property_segment['default']
    end

    # Bail if no "default"
    return false unless default_segment_key

    # Handle each set of value_ids
    property_counts.each do |property_count_row|
      value_ids = JSON.parse(property_count_row['values'])
      value_count = property_count_row['count']
      revisions_count = property_count_row['revisions_count'] || 0
      token_count = property_count_row['token_count'] || 0
      next unless value_ids.count.positive? && value_count.positive?

      # Handle each value_id in set
      value_ids.each do |value_id|
        matched_segment_key = nil

        # Find the matching segment
        property_segments.each do |property_segment|
          next unless property_segment['value_ids']&.include?(value_id)
          matched_segment_key = property_segment['key']
          break
        end

        # If no match found, use default
        matched_segment_key ||= default_segment_key

        # Increment the count
        segments[matched_segment_key][:count] = segments[matched_segment_key][:count] + value_count
        segments[matched_segment_key][:revisions_count] =
          segments[matched_segment_key][:revisions_count] + revisions_count
        segments[matched_segment_key][:token_count] =
          segments[matched_segment_key][:token_count] + token_count
      end
    end

    segments
  end

  def property_value_summary(classification:, property_id:, count: nil)
    # Grab all values for classification/property_id across all timepoints
    # ... for the sake of picking top X and putting others in "other"
    property_counts = Queries.article_bag_classification_values_for_property(
      article_bag_id: @topic.active_article_bag.id,
      classification_id: classification.id,
      property_id:
    )

    # Count each value
    counted_values = count_values(property_counts:)

    # Sort the values by count
    sorted_values = counted_values.sort_by do |_k, value|
      value[:count]
    end.reverse

    # Narrow down the list to most counted
    top_values = sorted_values.take(count || @top_value_count)

    # Return just the value ids
    top_values.pluck(0)
  end

  def count_values(property_counts:)
    segments = {}

    # Count up total of each value_id
    property_counts.each do |property_count_row|
      value_ids = JSON.parse(property_count_row['values'])
      value_count = property_count_row['count']
      revisions_count = property_count_row['revisions_count'] || 0
      token_count = property_count_row['token_count'] || 0
      next unless value_ids.count.positive? && value_count.positive?
      value_ids.each do |value_id|
        if segments[value_id]
          segments[value_id][:count] = segments[value_id][:count] + value_count
          segments[value_id][:revisions_count] =
            segments[value_id][:revisions_count] + revisions_count
          segments[value_id][:token_count] = segments[value_id][:token_count] + token_count
          next
        end
        segments[value_id] = {
          count: value_count, count_delta: 0,
          revisions_count:, revisions_count_delta: 0,
          token_count:, token_count_delta: 0
        }
      end
    end

    segments
  end
end
