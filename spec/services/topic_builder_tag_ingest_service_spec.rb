# frozen_string_literal: true

require 'rails_helper'

describe TopicBuilderTagIngestService do
  let!(:wiki) { Wiki.find_or_create_by!(language: 'en', project: 'wikipedia') }
  let(:topic) { create(:topic, wiki:) }
  let!(:article_bag) { create(:article_bag, topic:) }

  let(:greta) { create(:article, title: 'Greta Thunberg', wiki:) }
  let(:carbon) { create(:article, title: 'Carbon capture', wiki:) }
  let(:untagged) { create(:article, title: 'Untagged Article', wiki:) }

  before do
    create(:article_bag_article, article_bag:, article: greta)
    create(:article_bag_article, article_bag:, article: carbon)
    create(:article_bag_article, article_bag:, article: untagged)
  end

  let(:package) do
    {
      'handle' => 'tbp_abc123',
      'schema_version' => 2,
      'articles' => [
        {
          'title' => 'Greta Thunberg',
          'centrality' => 8,
          'tags' => [
            { 'name' => 'biography',
              'values' => [
                { 'slug' => 'gender', 'value_ids' => ['Q6581072'] },
                { 'slug' => 'country', 'value_ids' => ['Q34'] }
              ] },
            { 'name' => 'movement', 'values' => [] }
          ]
        },
        {
          'title' => 'Carbon capture',
          'centrality' => 7,
          'tags' => [{ 'name' => 'mitigation', 'values' => [] }]
        },
        { 'title' => 'Untagged Article', 'centrality' => 1, 'tags' => [] }
      ],
      'tags' => [
        {
          'name' => 'biography',
          'description' => 'People notable for climate work.',
          'ordering' => 3,
          'derived_from' => 'wikidata:P31=Q5',
          'properties' => [
            { 'slug' => 'gender', 'name' => 'Gender',
              'wikidata_property_id' => 'P21',
              'segments' => [
                { 'key' => 'female', 'label' => 'Female',
                  'value_ids' => ['Q6581072'], 'default' => false },
                { 'key' => 'male', 'label' => 'Male',
                  'value_ids' => ['Q6581097'], 'default' => false },
                { 'key' => 'other', 'label' => 'Other', 'default' => true }
              ] },
            { 'slug' => 'country', 'name' => 'Country',
              'wikidata_property_id' => 'P27',
              'segments' => true }
          ]
        },
        {
          'name' => 'movement',
          'description' => 'Movement-related.',
          'ordering' => 1,
          'derived_from' => nil,
          'properties' => []
        },
        {
          'name' => 'mitigation',
          'description' => 'Reducing emissions.',
          'ordering' => 0,
          'derived_from' => nil,
          'properties' => []
        }
      ]
    }
  end

  describe '#sync!' do
    it 'creates Classifications for each tag in the package' do
      expect { described_class.new(topic:, package:).sync! }
        .to change { topic.classifications.count }.by(3)
    end

    it 'marks every created Classification as tb_payload-sourced' do
      described_class.new(topic:, package:).sync!
      expect(topic.classifications.pluck(:source).uniq).to eq([Classification::SOURCE_TB_PAYLOAD])
    end

    it 'records the tb_handle on each Classification' do
      described_class.new(topic:, package:).sync!
      expect(topic.classifications.pluck(:tb_handle).uniq).to eq(['tbp_abc123'])
    end

    it 'persists description, ordering, and derived_from from the package' do
      described_class.new(topic:, package:).sync!
      biography = topic.classifications.find_by(name: 'biography')
      expect(biography).to have_attributes(
        description: 'People notable for climate work.',
        ordering: 3,
        derived_from: 'wikidata:P31=Q5'
      )
    end

    it 'renames wikidata_property_id to property_id on classification properties' do
      described_class.new(topic:, package:).sync!
      biography = topic.classifications.find_by(name: 'biography')
      gender_prop = biography.properties.find { |p| p['slug'] == 'gender' }
      expect(gender_prop['property_id']).to eq('P21')
      expect(gender_prop).not_to have_key('wikidata_property_id')
    end

    it 'passes through segments arrays unchanged' do
      described_class.new(topic:, package:).sync!
      biography = topic.classifications.find_by(name: 'biography')
      gender_prop = biography.properties.find { |p| p['slug'] == 'gender' }
      expect(gender_prop['segments']).to be_an(Array)
      expect(gender_prop['segments'].size).to eq(3)
    end

    it 'preserves segments: true (auto-group) when present' do
      described_class.new(topic:, package:).sync!
      biography = topic.classifications.find_by(name: 'biography')
      country_prop = biography.properties.find { |p| p['slug'] == 'country' }
      expect(country_prop['segments']).to be(true)
    end

    it 'creates ArticleClassification rows for tagged articles' do
      expect { described_class.new(topic:, package:).sync! }
        .to change(ArticleClassification, :count).by(3)
      # Greta: biography + movement; Carbon: mitigation
    end

    it 'enriches per-article values with name + property_id from the parent classification' do
      described_class.new(topic:, package:).sync!
      biography = topic.classifications.find_by(name: 'biography')
      ac = ArticleClassification.find_by(classification: biography, article: greta)
      gender_value = ac.properties.find { |v| v['slug'] == 'gender' }
      expect(gender_value).to include(
        'name' => 'Gender',
        'slug' => 'gender',
        'property_id' => 'P21',
        'value_ids' => ['Q6581072']
      )
    end

    it 'does not create ArticleClassification rows for untagged articles' do
      described_class.new(topic:, package:).sync!
      expect(ArticleClassification.joins(:article).where(articles: { id: untagged.id })).to be_empty
    end

    it 'is a no-op when schema_version is 1' do
      package['schema_version'] = 1
      expect { described_class.new(topic:, package:).sync! }
        .not_to change(Classification, :count)
    end

    it 'is a no-op when the package has no tags' do
      package.delete('tags')
      expect { described_class.new(topic:, package:).sync! }
        .not_to change(Classification, :count)
    end

    describe 'drop-and-rebuild' do
      it 'destroys existing tb_payload classifications on rerun' do
        described_class.new(topic:, package:).sync!
        first_ids = topic.classifications.pluck(:id)

        described_class.new(topic:, package:).sync!
        second_ids = topic.classifications.pluck(:id)

        expect(second_ids & first_ids).to be_empty
      end

      it 'cascades to article_classifications on rerun' do
        described_class.new(topic:, package:).sync!
        described_class.new(topic:, package:).sync!
        # Same count (3), but all fresh rows.
        expect(ArticleClassification.count).to eq(3)
      end

      it 'leaves iv_classify-sourced classifications alone' do
        iv_cls = Classification.create!(
          name: 'Legacy',
          prerequisites: [],
          properties: [],
          source: Classification::SOURCE_IV_CLASSIFY
        )
        topic.classifications << iv_cls

        expect { described_class.new(topic:, package:).sync! }
          .not_to(change { Classification.exists?(iv_cls.id) })
      end
    end

    describe 'AI-judgment property without a wikidata_property_id' do
      before do
        package['tags'][0]['properties'] << {
          'slug' => 'tone', 'name' => 'Tone',
          'wikidata_property_id' => nil,
          'segments' => [
            { 'key' => 'urgent', 'label' => 'Urgent', 'default' => false },
            { 'key' => 'measured', 'label' => 'Measured', 'default' => true }
          ]
        }
      end

      it 'falls back to the slug as property_id' do
        described_class.new(topic:, package:).sync!
        biography = topic.classifications.find_by(name: 'biography')
        tone = biography.properties.find { |p| p['slug'] == 'tone' }
        expect(tone['property_id']).to eq('tone')
      end
    end
  end
end
