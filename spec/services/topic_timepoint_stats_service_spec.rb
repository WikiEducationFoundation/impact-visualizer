# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TopicTimepointStatsService do
  describe '#update_stats_for_topic_timepoint' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

    let(:topic_timepoint_stats_service) { described_class.new }

    it 'captures summarized stats for start TopicTimepoint' do
      # Ensure things are initialized
      start_topic_timepoint.update(
        articles_count: nil,
        articles_count_delta: nil,
        length_delta: nil,
        length: nil,
        revisions_count: nil,
        revisions_count_delta: nil,
        attributed_articles_created_delta: nil,
        token_count: nil,
        token_count_delta: nil,
        attributed_token_count: nil
      )

      classification_summary = [{
        count: 1,
        id: 123,
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
      }]

      expect_any_instance_of(ClassificationService).to(
        receive(:summarize_topic_timepoint)
          .with(topic_timepoint: start_topic_timepoint)
          .and_return(classification_summary)
      )

      # Update stats based on pre-existing
      topic_timepoint_stats_service.update_stats_for_topic_timepoint(
        topic_timepoint: start_topic_timepoint
      )

      start_topic_timepoint.reload
      expect(start_topic_timepoint).to have_attributes(
        articles_count: 2,
        articles_count_delta: 0,
        length_delta: 0,
        length: 200,
        revisions_count: 3,
        revisions_count_delta: 0,
        attributed_articles_created_delta: 1,
        average_wp10_prediction: 50.0,
        token_count: 30,
        token_count_delta: 0,
        attributed_token_count: 0,
        classifications: classification_summary.map(&:deep_stringify_keys)
      )

      expect(start_topic_timepoint.wp10_prediction_categories).to eq({ 'A' => 1 })
    end

    it 'captures summarized stats for end TopicTimepoint' do
      # Ensure things are initialized
      end_topic_timepoint.update(
        articles_count: nil,
        articles_count_delta: nil,
        length_delta: nil,
        length: nil,
        revisions_count: nil,
        revisions_count_delta: nil,
        attributed_revisions_count_delta: nil,
        attributed_length_delta: nil,
        token_count: nil,
        token_count_delta: nil,
        attributed_token_count: nil
      )

      # Update stats based on pre-existing
      topic_timepoint_stats_service.update_stats_for_topic_timepoint(
        topic_timepoint: end_topic_timepoint
      )

      end_topic_timepoint.reload
      expect(end_topic_timepoint).to have_attributes(
        articles_count: 2,
        articles_count_delta: 0,
        length_delta: 200,
        length: 400,
        revisions_count: 7,
        revisions_count_delta: 4,
        attributed_revisions_count_delta: 2,
        attributed_length_delta: 100,
        average_wp10_prediction: 55.0,
        token_count: 70,
        token_count_delta: 60,
        attributed_token_count: 40,
        classifications: []
      )
    end
  end
end
