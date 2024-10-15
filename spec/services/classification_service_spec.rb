# frozen_string_literal: true

require 'rails_helper'

describe ClassificationService do
  let(:topic) { create(:topic) }

  describe 'initialization' do
    it 'sets @topic instance variable' do
      classification_service = described_class.new(topic:)
      expect(classification_service.topic).to eq(topic)
    end

    it 'sets @wiki instance variable' do
      classification_service = described_class.new(topic:)
      expect(classification_service.wiki).to eq(topic.wiki)
    end
  end

  describe '#classify_all_articles' do
    include_context 'topic with two timepoints'

    it 'loops through all Topic articles' do
      classification_service = described_class.new(topic:)
      expect(classification_service).to receive(:classify_article).twice
      classification_service.classify_all_articles
    end
  end

  describe '#classify_article', vcr: true do
    let!(:subject) { described_class.new(topic:) }
    let!(:article) do
      import_service = ImportService.new(topic:)
      article_bag_article = import_service.import_article(article_title: ['Sierra Ferrell'],
                                                          article_bag: topic.active_article_bag)
      article_bag_article.article
    end
    let!(:classification) do
      classification = Classification.create!(
        name: 'Biography',
        prerequisites: [{
          name: 'Gender',
          property_id: 'P21',
          value_ids: %w[Q6581072 Q1234567],
          required: false
        }],
        properties: [{
          name: 'Gender',
          slug: 'gender',
          property_id: 'P21'
        }]
      )
      topic.classifications << classification
      classification
    end

    it 'classifies article' do
      subject.classify_article(article:)
      article.reload
      expect(article.classifications.count).to eq(1)
      expect(article.classifications.first).to eq(classification)
      article_classification = article.article_classifications.first
      expect(article_classification.classification).to eq(classification)
    end

    it 'classifies article and captures properties' do
      subject.classify_article(article:)
      article.reload
      expect(article.classifications.count).to eq(1)
      expect(article.classifications.first).to eq(classification)
      article_classification = article.article_classifications.first
      expect(article_classification.classification).to eq(classification)
      expect(article_classification.properties).to eq([
        'name' => 'Gender',
        'slug' => 'gender',
        'property_id' => 'P21',
        'value_ids' => ['Q6581072']
      ])
    end

    it 'does not create redundent classifications' do
      subject.classify_article(article:)
      subject.classify_article(article:)
      expect(article.classifications.count).to eq(1)
    end

    it 'updates existing classifications' do
      subject.classify_article(article:)
      expect(article.classifications.count).to eq(1)
      article_classification = article.article_classifications.first
      article_classification.update properties: []

      subject.classify_article(article:)
      expect(article.classifications.count).to eq(1)
      article_classification.reload
      expect(article_classification.properties).to eq([
        'name' => 'Gender',
        'slug' => 'gender',
        'property_id' => 'P21',
        'value_ids' => ['Q6581072']
      ])
    end

    it 'deletes previous classification if no longer matching' do
      subject.classify_article(article:)
      expect(article.classifications.count).to eq(1)
      classification.update prerequisites: []

      subject.classify_article(article:)
      expect(article.classifications.count).to eq(0)
    end
  end

  describe '#claims_meet_prerequisites?', vcr: true do
    let(:subject) { described_class.new(topic:) }
    let(:claims) do
      wiki_action_api = WikiActionApi.new(Wiki.default_wiki)
      wiki_action_api.get_wikidata_claims('Sierra Ferrell')
    end

    it 'returns false if claims do not meet prerequisites, property_id only' do
      prerequisites = [{
        name: 'Gender',
        property_id: 'X21',
        required: false
      }]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(false)
    end

    it 'returns true if only one claim meets prerequisites, property_id only' do
      prerequisites = [
        {
          name: 'Gender',
          property_id: 'P21',
          required: false
        },
        {
          name: 'XGender',
          property_id: 'X21',
          required: false
        }
      ]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(true)
    end

    it 'returns true if only one claim meets prerequisites, different order, property_id only' do
      prerequisites = [
        {
          name: 'XGender',
          property_id: 'X21',
          required: false
        },
        {
          name: 'Gender',
          property_id: 'P21',
          required: false
        }
      ]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(true)
    end

    it 'returns false if one required claim meets prerequisites, property_id only' do
      prerequisites = [
        {
          name: 'XGender',
          property_id: 'X21',
          required: true
        },
        {
          name: 'Gender',
          property_id: 'P21',
          required: false
        }
      ]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(false)
    end

    it 'returns true if requred claim meets prerequisites, property_id only' do
      prerequisites = [
        {
          name: 'XGender',
          property_id: 'X21',
          required: false
        },
        {
          name: 'Gender',
          property_id: 'P21',
          required: true
        }
      ]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(true)
    end

    it 'returns true if claims do not meet prerequisites, with +property_id & +valid_id' do
      prerequisites = [{
        name: 'Gender',
        property_id: 'P21',
        value_ids: %w[Q6581072 Q1234567],
        required: false
      }]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(true)
    end

    it 'returns false if claims do not meet prerequisites, with +property_id & -valid_id' do
      prerequisites = [{
        name: 'Gender',
        property_id: 'P21',
        value_ids: %w[QXXXXXX],
        required: false
      }]
      matched = subject.claims_meet_prerequisites?(claims:, prerequisites:)
      expect(matched).to eq(false)
    end
  end

  describe '#properties_from_claims', vcr: true do
    let(:subject) { described_class.new(topic:) }
    let(:claims) do
      wiki_action_api = WikiActionApi.new(Wiki.default_wiki)
      wiki_action_api.get_wikidata_claims('Sierra Ferrell')
    end

    it 'returns false if claims do not meet prerequisites, property_id only' do
      properties = [{
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21'
      }]
      captured_properties = subject.properties_from_claims(claims:, properties:)
      expect(captured_properties).to eq([
        name: 'Gender',
        slug: 'gender',
        property_id: 'P21',
        value_ids: ['Q6581072']
      ])
    end
  end

  describe '#extract_claim_value_ids', vcr: true do
    let(:subject) { described_class.new(topic:) }
    let(:claims) do
      wiki_action_api = WikiActionApi.new(Wiki.default_wiki)
      wiki_action_api.get_wikidata_claims('Sierra Ferrell')
    end

    it 'extracts value IDs from claim property, example: P106' do
      claim = claims['P106']
      extracted_value_ids = subject.extract_claim_value_ids(claim)
      expect(extracted_value_ids).to eq(%w[Q177220 Q66763670])
    end

    it 'extracts value IDs from claim property, example: P31' do
      claim = claims['P31']
      extracted_value_ids = subject.extract_claim_value_ids(claim)
      expect(extracted_value_ids).to eq(%w[Q5])
    end

    it 'extracts value IDs from claim property, example: P21' do
      claim = claims['P21']
      extracted_value_ids = subject.extract_claim_value_ids(claim)
      expect(extracted_value_ids).to eq(%w[Q6581072])
    end

    it 'extracts value IDs from claim property, example: P136' do
      claim = claims['P136']
      extracted_value_ids = subject.extract_claim_value_ids(claim)
      expect(extracted_value_ids).to eq(%w[Q213714 Q43343 Q131272 Q844245])
    end
  end

  describe '#summarize_topic_timepoint', vcr: true do
    include_context 'topic with two timepoints'
    let(:subject) { described_class.new(topic:) }
    let(:classification) { create(:classification) }

    before do
      topic.classifications << classification
      subject.classify_all_articles
    end

    it 'summarizes topic timepoint' do
      topic_timepoint = topic.topic_timepoints.first

      expect(Queries).to receive(:topic_timepoint_classification_values_for_property).and_return(
        [
          ['[]', 1],
          ['["Q48270"]', 1],
          ['["Q6581072"]', 1368],
          ['["Q6581072", "Q6581097"]', 2],
          ['["Q6581097", "Q6581072"]', 1]
        ]
      )

      summary = subject.summarize_topic_timepoint(topic_timepoint:)
      expect(summary).to eq([{
        count: 1,
        id: classification.id,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          values: {
            'Q48270' => 1,
            'Q6581072' => 1371,
            'Q6581097' => 3
          }
        }]
      }])
    end
  end
end
