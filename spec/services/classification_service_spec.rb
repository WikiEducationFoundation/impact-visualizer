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
      expect(classification_service).to receive(:classify_article).thrice
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
          property_id: 'P21',
          segments: false
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

  describe '#summarize_topic', vcr: true do
    include_context 'topic with two timepoints'
    let(:subject) { described_class.new(topic:) }
    let(:classification) { create(:biography) }
    let(:topic_timepoint) { topic.topic_timepoints.last }
    let(:previous_topic_timepoint) { topic.topic_timepoints.first }

    before do
      topic.classifications << classification
      subject.classify_all_articles
    end

    it 'counts classifications' do
      summary = subject.summarize_topic

      expect(summary).to eq([{
        count: 2,
        id: classification.id,
        name: 'Biography',
        properties: classification.properties
      }])
    end
  end

  describe '#summarize_topic_timepoint', vcr: true do
    include_context 'topic with two timepoints'
    let(:subject) { described_class.new(topic:) }
    let(:classification) { create(:biography) }
    let(:topic_timepoint) { topic.topic_timepoints.last }
    let(:previous_topic_timepoint) { topic.topic_timepoints.first }

    before do
      topic.classifications << classification
      subject.classify_all_articles

      # Setup previous topic timepoint for delta calculation
      previous_topic_timepoint.classifications = [{
        count: 1,
        count_delta: 0,
        revisions_count: 2,
        revisions_count_delta: 0,
        token_count: 20,
        token_count_delta: 0,
        id: classification.id,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: {
            'other' => { count: 0, count_delta: 0, revisions_count: 4, token_count: 100, label: 'other' },
            'Q6581072' => { count: 1368, count_delta: 0, revisions_count: 5000, token_count: 10000, label: 'female' },
            'Q6581097' => { count: 0, count_delta: 0, revisions_count: 50, token_count: 2000, label: 'male' }
          }
        }]
      }]
      previous_topic_timepoint.save
    end

    it 'counts classifications, and counts all values as segments' do
      classification.properties[0][:segments] = true
      classification.save
      subject.top_value_count = 2

      expect(Queries).to receive(:article_bag_classification_values_for_property).and_return(
        [
          { 'values' => '[]', 'count' => 1 },
          { 'values' => '["Q48270"]', 'count' => 1 },
          { 'values' => '["Q6581072"]', 'count' => 1368 },
          { 'values' => '["Q6581072", "Q6581097"]', 'count' => 2 },
          { 'values' => '["Q6581097", "Q6581072"]', 'count' => 1 }
        ]
      )

      expect(Queries).to receive(:topic_timepoint_classification_values_for_property).and_return(
        [
          { 'values' => '[]', 'count' => 1, 'revisions_count' => 0, 'token_count' => 0 },
          { 'values' => '["Q48270"]', 'count' => 1, 'revisions_count' => 10, 'token_count' => 200 },
          { 'values' => '["Q6581072"]', 'count' => 1368, 'revisions_count' => 10000, 'token_count' => 15000 },
          { 'values' => '["Q6581072", "Q6581097"]', 'count' => 2, 'revisions_count' => 100, 'token_count' => 1200 },
          { 'values' => '["Q6581097", "Q6581072"]', 'count' => 1, 'revisions_count' => 101, 'token_count' => 1500 }
        ]
      )

      summary = subject.summarize_topic_timepoint(topic_timepoint:, previous_topic_timepoint:)

      expect(summary).to eq([{
        count: 2,
        count_delta: 1,
        revisions_count: 8,
        revisions_count_delta: 6,
        token_count: 80,
        token_count_delta: 60,
        wp10_prediction_categories: { 'B' => 2 },
        id: classification.id,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: {
            'other' => {
              count: 1, count_delta: 1,
              revisions_count: 10, revisions_count_delta: 6,
              token_count: 200, token_count_delta: 100,
              label: 'Other'
            },
            'Q6581072' => {
              count: 1371, count_delta: 3,
              revisions_count: 10201, revisions_count_delta: 5201,
              token_count: 17700, token_count_delta: 7700,
              label: 'Female'
            },
            'Q6581097' => {
              count: 3, count_delta: 3,
              revisions_count: 201, revisions_count_delta: 151,
              token_count: 2700, token_count_delta: 700,
              label: 'Male'
            }
          }
        }]
      }])
    end

    it 'counts classifications, but no segments when segments=false' do
      classification.properties[0][:segments] = false
      classification.save

      summary = subject.summarize_topic_timepoint(topic_timepoint:, previous_topic_timepoint:)
      expect(summary).to eq([{
        count: 2,
        count_delta: 1,
        revisions_count: 8,
        revisions_count_delta: 6,
        token_count: 80,
        token_count_delta: 60,
        wp10_prediction_categories: { 'B' => 2 },
        id: classification.id,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: false
        }]
      }])
    end

    it 'counts classifications, and buckets values into segments' do
      previous_topic_timepoint.classifications[0]['properties'][0]['segments'] = {
        'female' => { count: 1368, count_delta: 0, revisions_count: 5000, token_count: 100 },
        'other' => { count: 0, count_delta: 0, revisions_count: 3, token_count: 0 },
        'male' => { count: 0, count_delta: 0, revisions_count: 50, token_count: 800 }
      }

      previous_topic_timepoint.save!

      classification.properties[0][:segments] = [
        { label: 'Female', key: 'female', value_ids: %w[Q6581072], default: false },
        { label: 'Male', key: 'male', value_ids: %w[Q6581097 Q48272], default: false },
        { label: 'Other', key: 'other', default: true }
      ]

      classification.save!

      expect(Queries).to receive(:topic_timepoint_classification_values_for_property).and_return(
        [
          { 'values' => '[]', 'count' => 1, 'revisions_count' => 0, 'token_count' => 0 },
          { 'values' => '["Q48270"]', 'count' => 1, 'revisions_count' => 3, 'token_count' => 20 },
          { 'values' => '["Q48271"]', 'count' => 1, 'revisions_count' => 4, 'token_count' => 20 },
          { 'values' => '["Q48272"]', 'count' => 1, 'revisions_count' => 5, 'token_count' => 30 },
          {
            'values' => '["Q6581072"]', 'count' => 1368,
            'revisions_count' => 10000, 'token_count' => 5000
          },
          {
            'values' => '["Q6581072", "Q6581097"]', 'count' => 2, 'revisions_count' => 100,
            'token_count' => 800
          },
          {
            'values' => '["Q6581097", "Q6581072"]', 'count' => 1,
            'revisions_count' => 1000, 'token_count' => 60
          }
        ]
      )

      summary = subject.summarize_topic_timepoint(topic_timepoint:, previous_topic_timepoint:)
      expect(summary).to eq([{
        count: 2,
        count_delta: 1,
        revisions_count: 8,
        revisions_count_delta: 6,
        token_count: 80,
        token_count_delta: 60,
        wp10_prediction_categories: { 'B' => 2 },
        id: classification.id,
        name: 'Biography',
        properties: [{
          name: 'Gender',
          property_id: 'P21',
          slug: 'gender',
          segments: {
            'female' => {
              count: 1371, count_delta: 3,
              revisions_count: 11100, revisions_count_delta: 6100,
              token_count: 5860, token_count_delta: 5760,
              label: 'Female'
            },
            'other' => {
              count: 2, count_delta: 2,
              revisions_count: 7, revisions_count_delta: 4,
              token_count: 40, token_count_delta: 40,
              label: 'Other'
            },
            'male' => {
              count: 4, count_delta: 4,
              revisions_count: 1105, revisions_count_delta: 1055,
              token_count: 890, token_count_delta: 90,
              label: 'Male'
            }
          }
        }]
      }])
    end
  end

  describe '#property_value_summary', vcr: true do
    include_context 'topic with two timepoints'
    let(:subject) { described_class.new(topic:) }
    let(:classification) { create(:biography) }

    it 'summarizes all values for a given classification property across all timepoints' do
      classification.properties[0][:segments] = true
      classification.save

      expect(Queries).to receive(:article_bag_classification_values_for_property).and_return(
        [
          { 'values' => '[]', 'count' => 1 },
          { 'values' => '["Q48270"]', 'count' => 1 },
          { 'values' => '["Q48271"]', 'count' => 1 },
          { 'values' => '["Q48272"]', 'count' => 1 },
          { 'values' => '["Q6581072"]', 'count' => 1368 },
          { 'values' => '["Q6581072", "Q6581097"]', 'count' => 2 },
          { 'values' => '["Q6581097", "Q6581072"]', 'count' => 1 }
        ]
      )

      summary = subject.property_value_summary(classification:, property_id: 'P21', count: 3)
      expect(summary).to eq(%w[Q6581072 Q6581097 Q48272])
    end
  end
end
