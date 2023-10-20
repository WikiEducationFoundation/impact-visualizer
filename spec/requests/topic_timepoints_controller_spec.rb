# frozen_string_literal: true

require 'rails_helper'

describe TopicTimepointsController do
  describe '#index' do
    let!(:topic) { create(:topic) }
    let!(:topic_timepoints) { create_list(:topic_timepoint, 10, topic:) }
    let!(:topic_timepoint) { topic_timepoints.first }

    it 'renders successfully and has the expected fields' do
      get "/api/topics/#{topic.id}/topic_timepoints"
      body = response.parsed_body
      expect(response.status).to eq(200)
      expect(body['topic_timepoints'].count).to eq(10)
      first_response_topic_timepoint = body['topic_timepoints'][0].with_indifferent_access

      expect(first_response_topic_timepoint).to include(
        id: topic_timepoint.id,
        articles_count: topic_timepoint.articles_count,
        articles_count_delta: topic_timepoint.articles_count_delta,
        attributed_articles_created_delta: topic_timepoint.attributed_articles_created_delta,
        attributed_length_delta: topic_timepoint.attributed_length_delta,
        attributed_revisions_count_delta: topic_timepoint.attributed_revisions_count_delta,
        attributed_token_count: topic_timepoint.attributed_token_count,
        average_wp10_prediction: topic_timepoint.average_wp10_prediction,
        wp10_prediction_categories: topic_timepoint.wp10_prediction_categories,
        length: topic_timepoint.length,
        length_delta: topic_timepoint.length_delta,
        revisions_count: topic_timepoint.revisions_count,
        revisions_count_delta: topic_timepoint.revisions_count_delta,
        token_count: topic_timepoint.token_count,
        token_count_delta: topic_timepoint.token_count_delta
      )

      expect(Date.parse(first_response_topic_timepoint['timestamp']))
        .to eq(topic_timepoint.timestamp)
    end
  end
end
