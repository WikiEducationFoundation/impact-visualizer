# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TopicArticleTimepointStatsService do
  describe '#update_stats_for_topic_article_timepoint' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

    before do
      params = {
        attributed_length_delta: nil, attributed_revisions_count_delta: nil
      }
      start_topic_article_timepoint_1.update params
      start_topic_article_timepoint_2.update params
      end_topic_article_timepoint_1.update params
      end_topic_article_timepoint_2.update params
    end

    it 'updates length_delta based on previous article_timpoint' do
      # Reset length_delta so we can test it being updated
      end_topic_article_timepoint_1.update length_delta: nil

      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_stats_for_topic_article_timepoint
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.length_delta).to eq(100)
    end

    it 'updates length_delta even if no previous article_timpoint' do
      # Reset length_delta so we can test it being updated
      start_topic_article_timepoint_1.update length_delta: nil
      service = described_class.new(topic_article_timepoint: start_topic_article_timepoint_1)
      service.update_stats_for_topic_article_timepoint
      start_topic_article_timepoint_1.reload
      expect(start_topic_article_timepoint_1.length_delta).to eq(0)
    end

    it 'updates revisions_count_delta' do
      # Reset length_delta so we can test it being updated
      end_topic_article_timepoint_1.update revisions_count_delta: nil

      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_stats_for_topic_article_timepoint
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.revisions_count_delta).to eq(2)
    end

    it 'updates attributed_creation_at and attributed_creator' do
      user = create(:user, wiki_user_id: 123)
      create(:topic_user, user:, topic:)

      first_revision_at = Time.zone.now
      article_1.update(first_revision_by_id: 123, first_revision_at:)

      service = described_class.new(topic_article_timepoint: start_topic_article_timepoint_1)
      service.update_stats_for_topic_article_timepoint
      start_topic_article_timepoint_1.reload

      expect(start_topic_article_timepoint_1.attributed_creator).to eq(user)
      expect(start_topic_article_timepoint_1.attributed_creation_at).to eq(first_revision_at)
    end

    it 'updates attributed_length_delta and attributed_revisions_count_delta' do
      user1 = create(:user, wiki_user_id: revisions_response[0][:userid])
      user2 = create(:user, wiki_user_id: revisions_response[1][:userid])

      create(:topic_user, user: user1, topic:)
      create(:topic_user, user: user2, topic:)

      expect_any_instance_of(WikiActionApi).to(
        receive(:get_all_revisions_in_range)
          .once
          .with(pageid: 2364730, start_timestamp: start_date, end_timestamp: end_date)
          .and_return(revisions_response)
      )

      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_stats_for_topic_article_timepoint

      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.attributed_length_delta).to eq(8605)
      expect(end_topic_article_timepoint_1.attributed_revisions_count_delta).to eq(2)
    end

    it 'does not update attributed values if revision is negative' do
      user1 = create(:user, wiki_user_id: revisions_response[0][:userid])
      user2 = create(:user, wiki_user_id: revisions_response[2][:userid])

      create(:topic_user, user: user1, topic:)
      create(:topic_user, user: user2, topic:)

      expect_any_instance_of(WikiActionApi).to(
        receive(:get_all_revisions_in_range)
          .once
          .with(pageid: 2364730, start_timestamp: start_date, end_timestamp: end_date)
          .and_return(revisions_response)
      )

      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_stats_for_topic_article_timepoint

      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.attributed_length_delta).to eq(8575)
      expect(end_topic_article_timepoint_1.attributed_revisions_count_delta).to eq(1)
    end
  end
end
