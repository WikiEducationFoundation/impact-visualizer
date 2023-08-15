# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TopicTimepointStatsService do
  describe '#update_closest_revision_id' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

    let(:topic_timepoint_stats_service) { described_class.new }

    it 'gets and saves the closest revision_id to timestamp across all of Wikipedia', vcr: true do
      start_topic_timepoint.update closest_revision_id: nil
      topic_timepoint_stats_service.update_closest_revision_id(
        topic_timepoint: start_topic_timepoint
      )
      start_topic_timepoint.reload
      expect(start_topic_timepoint.closest_revision_id).to eq(1130787318)
    end

    it 'does not make API if topic_timepoint already has closest_revision_id' do
      start_topic_timepoint.update closest_revision_id: 123
      expect_any_instance_of(WikiActionApi).not_to receive(:get_revision_at_timestamp)
      topic_timepoint_stats_service.update_closest_revision_id(
        topic_timepoint: start_topic_timepoint
      )
    end
  end

  describe '#update_stats_for_topic_timepoint' do
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
        attributed_articles_created_delta: nil,
        token_count: nil,
        token_count_delta: nil,
        attributed_token_count: nil,
        attributed_token_count_delta: nil
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
        attributed_articles_created_delta: 1,
        average_wp10_prediction: 50.0,
        token_count: 30,
        token_count_delta: 0,
        attributed_token_count: 0,
        attributed_token_count_delta: 0
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
        attributed_length_delta: nil,
        token_count: nil,
        token_count_delta: nil,
        attributed_token_count: nil,
        attributed_token_count_delta: nil
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
        attributed_length_delta: 100,
        average_wp10_prediction: 55.0,
        token_count: 70,
        token_count_delta: 60,
        attributed_token_count: 40,
        attributed_token_count_delta: 20
      )
    end
  end
end
