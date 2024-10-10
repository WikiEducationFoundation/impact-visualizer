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
    value_ids = []
    claim.each do |prop|
      id = prop.dig('mainsnak', 'datavalue', 'value', 'id')
      value_ids << id if id.present?
    end
    value_ids
  end
end
