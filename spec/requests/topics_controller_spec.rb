# frozen_string_literal: true

require 'rails_helper'

describe TopicsController do
  describe '#index' do
    let!(:topics) { create_list(:topic, 10) }
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
        token_count_delta: 200
      )
    end

    it 'renders successfully and has the expected fields' do
      get '/api/topics'
      body = response.parsed_body
      expect(response.status).to eq(200)
      expect(body['topics'].count).to eq(10)
      first_response_topic = body['topics'][0].with_indifferent_access
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
        token_count_delta: 200
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
end
