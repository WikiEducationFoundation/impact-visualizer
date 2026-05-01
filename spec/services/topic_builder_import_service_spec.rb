# frozen_string_literal: true

require 'rails_helper'

describe TopicBuilderImportService do
  let!(:wiki) { Wiki.find_or_create_by!(language: 'en', project: 'wikipedia') }
  let(:package) do
    {
      'handle' => 'tbp_abc123',
      'schema_version' => 1,
      'config' => {
        'name' => 'Educational Psychology',
        'slug' => 'educational-psychology',
        'description' => 'A topic.',
        'editor_label' => 'students',
        'start_date' => '2026-01-15',
        'end_date' => '2026-05-30',
        'timepoint_day_interval' => 30,
        'wiki' => 'en'
      },
      'articles' => [
        { 'title' => 'Achievement gap', 'centrality' => 8 },
        { 'title' => 'Active learning', 'centrality' => nil }
      ],
      'article_count' => 2,
      'source_topic' => 'educational psychology'
    }
  end

  describe '#import!' do
    it 'creates a Topic and an empty ArticleBag atomically (articles are imported async)' do
      expect {
        described_class.new(package: package).import!
      }.to change(Topic, :count).by(1)
        .and change(ArticleBag, :count).by(1)
        .and change(Article, :count).by(0)
        .and change(ArticleBagArticle, :count).by(0)
    end

    it 'sets topic fields from the package config' do
      topic = described_class.new(package: package).import!
      expect(topic).to have_attributes(
        name: 'Educational Psychology',
        slug: 'educational-psychology',
        description: 'A topic.',
        editor_label: 'students',
        timepoint_day_interval: 30,
        display: false,
        wiki_id: wiki.id,
        tb_handle: 'tbp_abc123'
      )
      expect(topic.start_date.to_date).to eq(Date.new(2026, 1, 15))
      expect(topic.end_date.to_date).to eq(Date.new(2026, 5, 30))
    end

    it 'raises UnknownWikiError when IV has no row for the language' do
      package['config']['wiki'] = 'klingon'
      expect {
        described_class.new(package: package).import!
      }.to raise_error(TopicBuilderImportService::UnknownWikiError, /klingon/)
    end

    it 'associates the topic with a non-admin topic_editor' do
      editor = create(:topic_editor)
      topic = described_class.new(package: package, topic_editor: editor).import!
      expect(editor.topics).to include(topic)
    end

    it 'does not associate when topic_editor is an admin (admin posture)' do
      admin = create(:admin_user, email: 'admin@example.com', password: 'password123')
      topic = described_class.new(package: package, topic_editor: admin).import!
      expect(topic.topic_editors).to be_empty
    end
  end
end
