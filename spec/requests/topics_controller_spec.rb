# frozen_string_literal: true

require 'rails_helper'

describe TopicsController do
  let!(:topic_editor) do
    topic_editor = create(:topic_editor)
    create_list(:topic, 8, display: false) do |topic|
      topic_editor.topics << topic
    end
    topic_editor
  end
  let!(:wiki) { Wiki.default_wiki }
  let!(:classifications) { create_list(:biography, 2) }

  describe '#index' do
    let!(:topics) { create_list(:topic, 10, display: true) }
    let!(:topic) { topics.first }
    let!(:topic_summary) do
      TopicSummary.create!(
        topic:,
        articles_count: 30,
        articles_count_delta: 20,
        attributed_articles_created_delta: 10,
        attributed_length_delta: 200,
        attributed_revisions_count_delta: 10,
        attributed_token_count: 6,
        average_wp10_prediction: 20.0,
        length: 900,
        length_delta: 600,
        revisions_count: 220,
        revisions_count_delta: 20,
        token_count: 300,
        token_count_delta: 200,
        classifications: []
      )
    end

    context 'with no topic_editor' do
      it 'returns only public "displayed" Topics and has the expected fields' do
        get '/api/topics'
        body = response.parsed_body
        expect(response.status).to eq(200)
        expect(body['topics'].count).to eq(10)
        first_response_topic = body['topics'][0].with_indifferent_access
        topic = Topic.find(first_response_topic['id'])
        expect(first_response_topic).to include(
          id: topic.id,
          name: topic.name,
          description: topic.description,
          editor_label: topic.editor_label,
          start_date: topic.start_date,
          end_date: topic.end_date,
          slug: topic.slug,
          timepoint_day_interval: topic.timepoint_day_interval,
          articles_count: topic_summary.articles_count,
          articles_count_delta: topic_summary.articles_count_delta
        )
      end
    end

    context 'with topic_editor' do
      it 'returns only Topics belonging to topic_editor' do
        sign_in topic_editor
        get '/api/topics', params: { owned: true }
        body = response.parsed_body
        expect(response.status).to eq(200)
        expect(body['topics'].count).to eq(8)
        topic = Topic.find(body['topics'][0]['id'])
        expect(topic_editor.topic_editor_topics.exists?(topic:)).to eq(true)
      end
    end
  end

  describe '#show' do
    let!(:topic) { create(:topic) }
    let!(:topic_summary) do
      TopicSummary.create!(
        topic:,
        articles_count: 30,
        articles_count_delta: 20,
        attributed_articles_created_delta: 10,
        attributed_length_delta: 200,
        attributed_revisions_count_delta: 10,
        attributed_token_count: 6,
        average_wp10_prediction: 20.0,
        length: 900,
        length_delta: 600,
        revisions_count: 220,
        revisions_count_delta: 20,
        token_count: 300,
        token_count_delta: 200,
        classifications: []
      )
    end

    it 'renders successfully and has the expected fields' do
      get "/api/topics/#{topic.id}"
      body = response.parsed_body.with_indifferent_access
      expect(response.status).to eq(200)
      expect(body).to include(
        id: topic.id,
        name: topic.name,
        description: topic.description,
        editor_label: topic.editor_label,
        user_count: topic.user_count,
        start_date: topic.start_date,
        end_date: topic.end_date,
        slug: topic.slug,
        timepoint_day_interval: topic.timepoint_day_interval,
        articles_count: topic_summary.articles_count,
        articles_count_delta: topic_summary.articles_count_delta
      )
    end
  end

  describe '#create' do
    it 'creates a new Topic belonging to Topic editor' do
      sign_in topic_editor
      start_date = Time.zone.now - 1.year
      end_date = Time.zone.now
      params = {
        topic: {
          name: 'My Topic',
          slug: 'my_topic',
          description: 'My topic description.',
          wiki_id: wiki.id,
          chart_time_unit: 'month',
          editor_label: 'editor',
          start_date:,
          end_date:,
          timepoint_day_interval: 30
        }
      }
      post('/api/topics', params:)
      body = response.parsed_body.with_indifferent_access
      expect(body).to include(
        name: 'My Topic',
        slug: 'my_topic',
        description: 'My topic description.',
        wiki_id: wiki.id,
        chart_time_unit: 'month',
        editor_label: 'editor',
        timepoint_day_interval: 30
      )
      topic = Topic.find(body[:id])
      expect(topic.start_date.iso8601).to eq(start_date.iso8601)
      expect(topic.end_date.iso8601).to eq(end_date.iso8601)
      expect(topic.topic_editors.first).to eq(topic_editor)
      expect(response.status).to eq(200)
    end

    it 'creates a new Topic belonging to Topic editor with CSV' do
      sign_in topic_editor
      start_date = Time.zone.now - 1.year
      end_date = Time.zone.now

      articles_csv = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      users_csv = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')

      expect_any_instance_of(Topic).to receive(:queue_users_import)

      params = {
        topic: {
          name: 'My Topic',
          slug: 'my_topic',
          description: 'My topic description.',
          wiki_id: wiki.id,
          chart_time_unit: 'month',
          editor_label: 'editor',
          start_date:,
          end_date:,
          timepoint_day_interval: 30,
          users_csv:,
          articles_csv:
        }
      }
      post('/api/topics', params:)
      body = response.parsed_body.with_indifferent_access
      expect(body).to include(
        name: 'My Topic',
        slug: 'my_topic',
        description: 'My topic description.',
        wiki_id: wiki.id,
        chart_time_unit: 'month',
        editor_label: 'editor',
        timepoint_day_interval: 30
      )
      topic = Topic.find(body[:id])
      expect(topic.start_date.iso8601).to eq(start_date.iso8601)
      expect(topic.end_date.iso8601).to eq(end_date.iso8601)
      expect(topic.topic_editors.first).to eq(topic_editor)
      expect(topic.users_csv.attached?).to eq(true)
      expect(topic.articles_csv.attached?).to eq(true)

      expect(response.status).to eq(200)
    end

    it 'returns unauthorized without current_topic_editor' do
      params = {
        name: 'My Topic',
        description: 'My topic description.'
      }
      post('/api/topics', params:)
      expect(response.status).to eq(401)
    end
  end

  describe '#update' do
    it 'updates a Topic belonging to Topic editor' do
      articles_csv = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      users_csv = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')

      expect_any_instance_of(Topic).to receive(:queue_users_import)

      sign_in topic_editor
      topic = topic_editor.topics.first
      params = {
        topic: {
          name: 'My New Topic Name',
          articles_csv:,
          users_csv:,
          classification_ids: classifications.pluck(:id)
        }
      }
      put("/api/topics/#{topic.id}", params:)
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq('My New Topic Name')
      expect(topic.name).to eq('My New Topic Name')
      expect(topic.classifications.count).to eq(2)
      expect(response.status).to eq(200)
    end

    it 'updates a Topic belonging to Topic editor, hashed classification_ids' do
      articles_csv = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')
      users_csv = fixture_file_upload('spec/fixtures/csv/topic-articles-test.csv')

      expect_any_instance_of(Topic).to receive(:queue_users_import)

      sign_in topic_editor
      topic = topic_editor.topics.first
      params = {
        topic: {
          name: 'My New Topic Name',
          articles_csv:,
          users_csv:,
          classification_ids: {
            '0' => classifications.first.id,
            '1' => classifications.second.id
          }
        }
      }
      put("/api/topics/#{topic.id}", params:)
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq('My New Topic Name')
      expect(topic.name).to eq('My New Topic Name')
      expect(topic.classifications.count).to eq(2)
      expect(response.status).to eq(200)
    end

    it 'returns 404 without associated current_topic_editor' do
      sign_in(create(:topic_editor))
      topic = topic_editor.topics.first
      params = {
        name: 'My Topic',
        description: 'My topic description.'
      }
      expect do
        put("/api/topics/#{topic.id}", params:)
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'returns unauthorized without current_topic_editor' do
      topic = topic_editor.topics.first
      params = {
        name: 'My Topic',
        description: 'My topic description.'
      }
      put("/api/topics/#{topic.id}", params:)
      expect(response.status).to eq(401)
    end
  end

  describe '#destroy' do
    it 'destroy a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      delete("/api/topics/#{topic.id}")
      expect(response.status).to eq(204)
    end

    it 'returns 404 without associated current_topic_editor' do
      sign_in(create(:topic_editor))
      topic = topic_editor.topics.first
      expect do
        delete("/api/topics/#{topic.id}")
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'returns unauthorized without current_topic_editor' do
      topic = topic_editor.topics.first
      delete("/api/topics/#{topic.id}")
      expect(response.status).to eq(401)
    end
  end

  describe '#import_users' do
    it 'initiates user import for a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      expect_any_instance_of(TopicService).to receive(:import_users).and_return(true)
      get("/api/topics/#{topic.id}/import_users")
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq(topic.name)
      expect(response.status).to eq(200)
    end

    it 'returns 404 without associated current_topic_editor' do
      sign_in(create(:topic_editor))
      topic = topic_editor.topics.first
      expect do
        get("/api/topics/#{topic.id}/import_users")
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'returns unauthorized without current_topic_editor' do
      topic = topic_editor.topics.first
      get("/api/topics/#{topic.id}/import_users")
      expect(response.status).to eq(401)
    end
  end

  describe '#import_articles' do
    it 'initiates article import for a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      expect_any_instance_of(TopicService).to receive(:import_articles).and_return(true)
      get("/api/topics/#{topic.id}/import_articles")
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq(topic.name)
      expect(response.status).to eq(200)
    end

    it 'returns 404 without associated current_topic_editor' do
      sign_in(create(:topic_editor))
      topic = topic_editor.topics.first
      expect do
        get("/api/topics/#{topic.id}/import_articles")
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'returns unauthorized without current_topic_editor' do
      topic = topic_editor.topics.first
      get("/api/topics/#{topic.id}/import_articles")
      expect(response.status).to eq(401)
    end
  end

  describe '#generate_timepoints' do
    it 'initiates timepoint generation (force_updates=false) for a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      expect_any_instance_of(TopicService)
        .to(receive(:generate_timepoints)
              .with(force_updates: false)
              .and_return(true))
      get("/api/topics/#{topic.id}/generate_timepoints")
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq(topic.name)
      expect(response.status).to eq(200)
    end

    it 'initiates timepoint generation (force_updates=true) for a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      expect_any_instance_of(TopicService)
        .to(receive(:generate_timepoints)
              .with(force_updates: true)
              .and_return(true))
      get("/api/topics/#{topic.id}/generate_timepoints?force_updates=true")
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq(topic.name)
      expect(response.status).to eq(200)
    end

    it 'returns 404 without associated current_topic_editor' do
      sign_in(create(:topic_editor))
      topic = topic_editor.topics.first
      expect do
        get("/api/topics/#{topic.id}/generate_timepoints")
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'returns unauthorized without current_topic_editor' do
      topic = topic_editor.topics.first
      get("/api/topics/#{topic.id}/generate_timepoints")
      expect(response.status).to eq(401)
    end
  end

  describe '#incremental_topic_build' do
    it 'initiates incremental topic build (force_updates=false) for a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      expect_any_instance_of(TopicService)
        .to(receive(:incremental_topic_build)
              .with(force_updates: false)
              .and_return(true))
      get("/api/topics/#{topic.id}/incremental_topic_build")
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq(topic.name)
      expect(response.status).to eq(200)
    end

    it 'initiates incremental topic build (force_updates=true) for a Topic belonging to Topic editor' do
      sign_in topic_editor
      topic = topic_editor.topics.first
      expect_any_instance_of(TopicService)
        .to(receive(:incremental_topic_build)
              .with(force_updates: true)
              .and_return(true))
      get("/api/topics/#{topic.id}/incremental_topic_build?force_updates=true")
      body = response.parsed_body.with_indifferent_access
      topic.reload
      expect(body[:name]).to eq(topic.name)
      expect(response.status).to eq(200)
    end

    it 'returns 404 without associated current_topic_editor' do
      sign_in(create(:topic_editor))
      topic = topic_editor.topics.first
      expect do
        get("/api/topics/#{topic.id}/incremental_topic_build")
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'returns unauthorized without current_topic_editor' do
      topic = topic_editor.topics.first
      get("/api/topics/#{topic.id}/incremental_topic_build")
      expect(response.status).to eq(401)
    end
  end
end
