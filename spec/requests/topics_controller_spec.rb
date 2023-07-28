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
        attributed_token_count_delta: 6,
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
      get '/topics'
      body = response.parsed_body
      expect(response.status).to eq(200)
      expect(body['topics'].count).to eq(10)
      first_response_topic = body['topics'][0]
      expect(first_response_topic['id']).to eq(topic.id)
      expect(first_response_topic['name']).to eq(topic.name)
      expect(first_response_topic['description']).to eq(topic.description)
      expect(first_response_topic['start_date']).to eq(topic.start_date)
      expect(first_response_topic['end_date']).to eq(topic.end_date)
      expect(first_response_topic['slug']).to eq(topic.slug)
      expect(first_response_topic['timepoint_day_interval']).to eq(topic.timepoint_day_interval)
      expect(first_response_topic['articles_count']).to eq(topic_summary.articles_count)
      expect(first_response_topic['articles_count_delta']).to eq(topic_summary.articles_count_delta)
    end
  end
end
