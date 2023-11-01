# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TopicArticleTimepointStatsService do
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

  describe '#update_stats_for_topic_article_timepoint' do
    it 'hands off to the appropriate methods' do
      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      expect(service).to receive(:update_baseline_deltas)
      expect(service).to receive(:update_attributed_deltas)
      expect(service).to receive(:update_attributed_creation)
      # expect(service).to receive(:update_token_stats)
      service.update_stats_for_topic_article_timepoint
    end
  end

  describe '#update_baseline_deltas' do
    it 'updates length_delta based on previous article_timpoint' do
      # Reset length_delta so we can test it being updated
      end_topic_article_timepoint_1.update length_delta: nil
      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_baseline_deltas
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.length_delta).to eq(100)
    end

    it 'updates to ZERO if article_timpoint missing data' do
      # Reset length_delta so we can test it being updated
      end_article_timepoint_1.update article_length: nil, revisions_count: nil
      end_topic_article_timepoint_1.update length_delta: nil
      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_baseline_deltas
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.length_delta).to eq(0)
      expect(end_topic_article_timepoint_1.revisions_count_delta).to eq(0)
    end

    it 'updates to ZERO if no previous article_timpoint AND is first timestamp in Topic' do
      # Reset length_delta so we can test it being updated
      start_topic_article_timepoint_1.update(
        length_delta: nil,
        revisions_count_delta: nil
      )
      service = described_class.new(topic_article_timepoint: start_topic_article_timepoint_1)
      service.update_baseline_deltas
      start_topic_article_timepoint_1.reload
      expect(start_topic_article_timepoint_1).to have_attributes(
        length_delta: 0,
        revisions_count_delta: 0
      )
    end

    it 'uses full length for delta if no previous article_timpoint AND NOT first timestamp in Topic' do
      # Reset length_delta so we can test it being updated
      end_topic_article_timepoint_1.update(
        length_delta: nil,
        revisions_count_delta: nil
      )

      # Destroy the start timepoint, so this acts like a new article
      start_topic_article_timepoint_1.destroy
      start_article_timepoint_1.destroy

      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_baseline_deltas
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1).to have_attributes(
        length_delta: 200,
        revisions_count_delta: 3
      )
    end

    it 'updates revisions_count_delta' do
      # Reset length_delta so we can test it being updated
      end_topic_article_timepoint_1.update revisions_count_delta: nil
      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_baseline_deltas
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.revisions_count_delta).to eq(2)
    end
  end

  describe '#update_attributed_deltas' do
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
      service.update_attributed_deltas

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
      service.update_attributed_deltas

      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.attributed_length_delta).to eq(8575)
      expect(end_topic_article_timepoint_1.attributed_revisions_count_delta).to eq(1)
    end
  end

  describe '#update_attributed_creation' do
    it 'updates attributed_creation_at and attributed_creator' do
      user = create(:user, wiki_user_id: 123)
      create(:topic_user, user:, topic:)

      first_revision_at = Time.zone.now
      article_1.update(first_revision_by_id: 123, first_revision_at:)

      service = described_class.new(topic_article_timepoint: start_topic_article_timepoint_1)
      service.update_attributed_creation
      start_topic_article_timepoint_1.reload

      expect(start_topic_article_timepoint_1.attributed_creator).to eq(user)
      expect(start_topic_article_timepoint_1.attributed_creation_at).to eq(first_revision_at)
    end
  end

  describe '#update_token_stats' do
    it 'updates attributed_token_count_delta', vcr: true do
      tokens = WikiWhoApi.new(wiki: Wiki.default_wiki).get_revision_tokens(
        end_article_timepoint_1.revision_id
      )

      # Give topic user a known editor ID from tokens
      user.update wiki_user_id: 917223

      # Reset the value to test
      end_topic_article_timepoint_1.update attributed_token_count: nil, token_count_delta: nil

      # Do it
      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_token_stats(tokens:)
      end_topic_article_timepoint_1.reload

      expect(end_topic_article_timepoint_1.attributed_token_count).to eq(11)
      expect(end_topic_article_timepoint_1.token_count_delta).to eq(20)
    end

    it 'set attributed_token_count_delta to ZERO if first
        timepoint AND is first timestamp in Topic', vcr: true do
      tokens = WikiWhoApi.new(wiki: Wiki.default_wiki).get_revision_tokens(
        end_article_timepoint_1.revision_id
      )

      # Give topic user a known editor ID from tokens
      user.update wiki_user_id: 917223

      # Reset the value to test
      start_topic_article_timepoint_1.update attributed_token_count: nil, token_count_delta: nil
      service = described_class.new(topic_article_timepoint: start_topic_article_timepoint_1)
      service.update_token_stats(tokens:)
      start_topic_article_timepoint_1.reload
      expect(start_topic_article_timepoint_1.attributed_token_count).to eq(0)
      expect(start_topic_article_timepoint_1.token_count_delta).to eq(0)
    end

    it 'uses full count for attributed_token_count_delta if
       first timepoint AND is NOT first timestamp in Topic', vcr: false do
      tokens = WikiWhoApi.new(wiki: Wiki.default_wiki).get_revision_tokens(
        end_article_timepoint_1.revision_id
      )

      # Give topic user a known editor ID from tokens
      user.update wiki_user_id: 42428311

      # Destroy first timepoints so this appears to be new to topic
      start_topic_article_timepoint_1.destroy
      start_article_timepoint_1.destroy

      # Reset the value to test
      end_topic_article_timepoint_1.update attributed_token_count: nil, token_count_delta: nil

      service = described_class.new(topic_article_timepoint: end_topic_article_timepoint_1)
      service.update_token_stats(tokens:)
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.attributed_token_count).to eq(26)
      expect(end_topic_article_timepoint_1.token_count_delta).to eq(30)
    end
  end
end
