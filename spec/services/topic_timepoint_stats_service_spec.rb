# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TopicTimepointStatsService do
  describe '.update_stats_for_topic_timepoint' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

    let(:topic_timepoint_stats_service) { described_class.new }

    it 'captures summarized stats for start TopicTimepoint' do
      # Ensure things are initialized
      start_topic_timepoint.update(
        articles_count: nil,
        length_delta: nil,
        length: nil,
        revisions_count: nil,
        revisions_count_delta: nil,
        attributed_articles_created_delta: nil
      )

      # Update stats based on pre-existing
      topic_timepoint_stats_service.update_stats_for_topic_timepoint(
        topic_timepoint: start_topic_timepoint
      )

      start_topic_timepoint.reload
      expect(start_topic_timepoint).to have_attributes(
        articles_count: 2,
        length_delta: 0,
        length: 200,
        revisions_count: 3,
        revisions_count_delta: 0,
        attributed_articles_created_delta: 1
      )
    end

    it 'captures summarized stats for end TopicTimepoint' do
      # Ensure things are initialized
      end_topic_timepoint.update(
        articles_count: nil,
        length_delta: nil,
        length: nil,
        revisions_count: nil,
        revisions_count_delta: nil,
        attributed_revisions_count_delta: nil,
        attributed_length_delta: nil
      )

      # Update stats based on pre-existing
      topic_timepoint_stats_service.update_stats_for_topic_timepoint(
        topic_timepoint: end_topic_timepoint
      )

      end_topic_timepoint.reload
      expect(end_topic_timepoint).to have_attributes(
        articles_count: 2,
        length_delta: 200,
        length: 400,
        revisions_count: 7,
        revisions_count_delta: 4,
        attributed_revisions_count_delta: 2,
        attributed_length_delta: 100
      )
    end
  end
end
