# frozen_string_literal: true

# Persists the v2 Topic Builder package's tag taxonomy + per-article
# tag membership into IV's Classification / ArticleClassification
# tables. Idempotent drop-and-rebuild: existing tb_payload-sourced
# classifications for the topic are destroyed and recreated from the
# package; iv_classify-sourced rows are left alone.
#
# Two enrichments happen at persist time so the chart code can read
# through unchanged:
#   - property `wikidata_property_id` -> `property_id` (falls back to
#     the property's `slug` when the AI-judgment property has no
#     Wikidata id).
#   - per-article values gain `name` + `property_id` looked up from the
#     parent classification's properties array (TB ships them as
#     just `{slug, value_ids}`).
class TopicBuilderTagIngestService
  attr_reader :topic, :package

  def initialize(topic:, package:)
    @topic = topic
    @package = package
  end

  def self.applicable?(package)
    package['schema_version'] == 2 && package['tags'].present?
  end

  def sync!
    return unless self.class.applicable?(package)

    handle = package['handle']

    Classification.transaction do
      topic.classifications.tb_payload.destroy_all
      tag_records = create_classifications(handle)
      create_article_classifications(tag_records)
    end
  end

  private

  def create_classifications(handle)
    Array(package['tags']).each_with_object({}) do |tag, records|
      cls = topic.classifications.create!(
        name: tag['name'],
        description: tag['description'],
        derived_from: tag['derived_from'],
        ordering: tag['ordering'],
        prerequisites: [],
        properties: enrich_properties(tag['properties']),
        source: Classification::SOURCE_TB_PAYLOAD,
        tb_handle: handle
      )
      records[tag['name']] = cls
    end
  end

  # TB ships properties as { slug, name, wikidata_property_id, segments }.
  # IV's PROPERTIES_SCHEMA requires { name, slug, property_id, segments }.
  # For AI-judgment properties without a Wikidata id, the slug doubles as
  # the property_id; the chart code uses property_id purely as an opaque
  # key for grouping.
  def enrich_properties(properties)
    Array(properties).map do |prop|
      {
        'name' => prop['name'],
        'slug' => prop['slug'],
        'property_id' => prop['wikidata_property_id'] || prop['slug'],
        'segments' => prop['segments']
      }
    end
  end

  def create_article_classifications(tag_records)
    return if tag_records.empty?

    tagged_entries = Array(package['articles']).select do |entry|
      entry['tags'].present?
    end
    return if tagged_entries.empty?

    titles = tagged_entries.map { |e| e['title'].to_s }
    articles_by_title = topic.articles.where(title: titles).index_by(&:title)

    tagged_entries.each do |entry|
      article = articles_by_title[entry['title'].to_s]
      next unless article

      entry['tags'].each do |article_tag|
        classification = tag_records[article_tag['name']]
        next unless classification

        ArticleClassification.create!(
          classification:,
          article:,
          properties: enrich_article_values(classification, article_tag['values'])
        )
      end
    end
  end

  # TB ships per-article values as { slug, value_ids }. IV's
  # ArticleClassification PROPERTIES_SCHEMA requires
  # { name, slug, property_id, value_ids }. We backfill name + property_id
  # by looking the slug up in the parent classification's properties.
  def enrich_article_values(classification, values)
    property_lookup = Array(classification.properties).index_by { |p| p['slug'] }

    Array(values).filter_map do |value|
      parent = property_lookup[value['slug']]
      next nil unless parent

      {
        'name' => parent['name'],
        'slug' => value['slug'],
        'property_id' => parent['property_id'],
        'value_ids' => Array(value['value_ids'])
      }
    end
  end
end
