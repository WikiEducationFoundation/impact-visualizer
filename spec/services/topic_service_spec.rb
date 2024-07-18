# frozen_string_literal: true

require 'rails_helper'

describe TopicService do
  let(:topic) { create(:topic) }
  let(:topic_editor) { create(:topic_editor) }

  before do
    topic_editor.topics << topic
  end

  describe '.initialize' do
    it 'initializes and has @topic_editor variable' do
      topic_service = described_class.new(topic_editor:)
      expect(topic_service).to be_a(described_class)
      expect(topic_service.topic_editor).to eq(topic_editor)
      expect(topic_service.topic).to be_nil
    end

    it 'initializes and has @topic variable' do
      topic_service = described_class.new(topic:, topic_editor:)
      expect(topic_service).to be_a(described_class)
      expect(topic_service.topic).to eq(topic)
      expect(topic_service.topic_editor).to eq(topic_editor)
    end

    it 'raises without @topic_editor' do
      expect do
        described_class.new(topic:)
      end.to raise_error(ArgumentError)
    end

    it 'raises without @topic_editor authorization' do
      TopicEditorTopic.destroy_all
      expect do
        described_class.new(topic:, topic_editor:)
      end.to raise_error(ImpactVisualizerErrors::TopicEditorNotAuthorizedForTopic)
    end
  end

  describe '#create_topic' do
    it 'creates topic and topic_editor_topic, does not queue import' do
      topic_params = build(:topic).attributes
      topic_params[:articles_csv] = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      topic_params[:users_csv] = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      topic_service = described_class.new(topic_editor:)

      expect_any_instance_of(Topic).not_to receive(:queue_users_import)

      topic = topic_service.create_topic(topic_params:)
      expect(topic).to be_a Topic
      expect(topic).to have_attributes(
        name: topic_params['name'],
        description: topic_params['description'],
        slug: topic_params['slug'],
        wiki: Wiki.find(topic_params['wiki_id'])
      )
      expect(topic.users_csv.attached?).to eq(true)
      expect(topic.articles_csv.attached?).to eq(true)
      expect(topic.topic_editors).to include(topic_editor)
      expect(topic_editor.topics).to include(topic)
    end

    it 'creates topic and topic_editor_topic, queues import' do
      topic_params = build(:topic).attributes
      topic_service = described_class.new(topic_editor:, auto_import: true)
      topic_params[:articles_csv] = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      topic_params[:users_csv] = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')

      expect_any_instance_of(Topic).to receive(:queue_users_import)

      topic = topic_service.create_topic(topic_params:)
      expect(topic).to be_a Topic
      expect(topic).to have_attributes(
        name: topic_params['name'],
        description: topic_params['description'],
        slug: topic_params['slug'],
        wiki: Wiki.find(topic_params['wiki_id'])
      )

      expect(topic.users_csv.attached?).to eq(true)
      expect(topic.articles_csv.attached?).to eq(true)
      expect(topic.topic_editors).to include(topic_editor)
      expect(topic_editor.topics).to include(topic)
    end
  end

  describe '#update_topic' do
    it 'raises if no topic' do
      topic_service = described_class.new(topic_editor:)
      expect do
        topic_service.update_topic(topic_params: {})
      end.to raise_error(ImpactVisualizerErrors::TopicMissing)
    end

    it 'updates topic, does not queue import' do
      expect_any_instance_of(Topic).not_to receive(:queue_users_import)
      topic_service = described_class.new(topic:, topic_editor:)
      topic = topic_service.update_topic(topic_params: {
        name: 'New Topic Name',
        description: 'New Topic Description',
        articles_csv: fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv'),
        users_csv: fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      })
      expect(topic).to have_attributes(
        name: 'New Topic Name',
        description: 'New Topic Description'
      )
      expect(topic.users_csv.attached?).to eq(true)
      expect(topic.articles_csv.attached?).to eq(true)
    end

    it 'updates topic, queues import' do
      expect_any_instance_of(Topic).to receive(:queue_users_import)
      topic_service = described_class.new(topic:, topic_editor:, auto_import: true)
      topic = topic_service.update_topic(topic_params: {
        name: 'New Topic Name',
        description: 'New Topic Description',
        articles_csv: fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv'),
        users_csv: fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      })
      expect(topic).to have_attributes(
        name: 'New Topic Name',
        description: 'New Topic Description'
      )
      expect(topic.users_csv.attached?).to eq(true)
      expect(topic.articles_csv.attached?).to eq(true)
    end
  end

  describe '#delete_topic' do
    it 'raises if no topic' do
      topic_service = described_class.new(topic_editor:)
      expect do
        topic_service.delete_topic
      end.to raise_error(ImpactVisualizerErrors::TopicMissing)
    end

    it 'deletes the topic' do
      topic_service = described_class.new(topic:, topic_editor:)
      topic_service.delete_topic
      expect do
        topic.reload
      end.to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe '#import_users' do
    it 'raises if no topic' do
      topic_service = described_class.new(topic_editor:)
      expect do
        topic_service.import_users
      end.to raise_error(ImpactVisualizerErrors::TopicMissing)
    end

    it 'raises if no csv attached' do
      topic_service = described_class.new(topic_editor:, topic:)
      expect do
        topic_service.import_users
      end.to raise_error(ImpactVisualizerErrors::CsvMissingForImport)
    end

    it 'initiates user import from attached csv' do
      topic.users_csv.attach(
        io: File.open('spec/fixtures/csv/topic-users-test.csv'),
        filename: 'topic-users-test.csv'
      )
      topic_service = described_class.new(topic_editor:, topic:)
      expect(topic).to receive(:queue_users_import)
      topic_service.import_users
    end
  end

  describe '#import_articles' do
    it 'raises if no topic' do
      topic_service = described_class.new(topic_editor:)
      expect do
        topic_service.import_articles
      end.to raise_error(ImpactVisualizerErrors::TopicMissing)
    end

    it 'raises if no csv attached' do
      topic_service = described_class.new(topic_editor:, topic:)
      expect do
        topic_service.import_articles
      end.to raise_error(ImpactVisualizerErrors::CsvMissingForImport)
    end

    it 'initiates user import from attached csv' do
      topic.articles_csv.attach(
        io: File.open('spec/fixtures/csv/topic-articles-test.csv'),
        filename: 'topic-articles-test.csv'
      )
      topic_service = described_class.new(topic_editor:, topic:)
      expect(topic).to receive(:queue_articles_import)
      topic_service.import_articles
    end
  end

  describe '#generate_timepoints' do
    it 'raises if no topic' do
      topic_service = described_class.new(topic_editor:)
      expect do
        topic_service.generate_timepoints
      end.to raise_error(ImpactVisualizerErrors::TopicMissing)
    end

    it 'raises if no articles' do
      topic_service = described_class.new(topic_editor:, topic:)
      expect(topic).to receive(:articles_count).and_return(0)
      expect(topic).to receive(:user_count).and_return(1)
      expect do
        topic_service.generate_timepoints
      end.to raise_error(ImpactVisualizerErrors::TopicNotReadyForTimepointGeneration)
    end

    it 'raises if no users' do
      topic_service = described_class.new(topic_editor:, topic:)
      expect(topic).to receive(:user_count).and_return(0)
      expect do
        topic_service.generate_timepoints
      end.to raise_error(ImpactVisualizerErrors::TopicNotReadyForTimepointGeneration)
    end

    it 'initiates timepoint generation' do
      topic_service = described_class.new(topic_editor:, topic:)
      expect(topic).to receive(:user_count).and_return(1)
      expect(topic).to receive(:articles_count).and_return(1)
      expect(topic).to receive(:queue_generate_timepoints)
      topic_service.generate_timepoints
    end
  end
end
