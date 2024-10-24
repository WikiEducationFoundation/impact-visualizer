# frozen_string_literal: true

class WikidataTranslator
  attr_accessor :labels, :wiki

  def initialize(wiki:)
    @labels = []
    @wiki = wiki
    @wiki_action_api = WikiActionApi.new(wiki)
  end

  def preload(ids:)
    entities = @wiki_action_api.get_wikidata_labels(ids)

    prepped_labels = {}

    entities.each do |entity|
      id = entity.dig(1, 'id')
      label = entity.dig(1, 'labels', @wiki.language, 'value')
      prepped_labels[id] = label
    end

    @labels = prepped_labels
  end

  def translate(id)
    @labels[id] || id
  end
end
