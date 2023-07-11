# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe ArticleStatsService do
  describe '#update_stats_for_article_timepoint' do
    context 'when the article exists at timestamp' do
      let!(:article_stats_service) { described_class.new }
      let!(:article) { create(:article, pageid: 2364730, title: 'Yankari Game Reserve') }
      let!(:article_timepoint) do
        create(:article_timepoint, article:, timestamp: Date.new(2023, 1, 1))
      end

      before do
        article_stats_service.update_first_revision_info(article:)
        article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
        article_timepoint.reload
      end

      it 'captures revision_id', :vcr do
        expect(article_timepoint.revision_id).to eq(1100917005)
      end

      it 'captures article_length', :vcr do
        expect(article_timepoint.article_length).to eq(13079)
      end

      it 'updates revisions_count', :vcr do
        expect(article_timepoint.revisions_count).to eq(261)
      end
    end

    context 'when the article does not exist at timestamp' do
      let!(:article_stats_service) { described_class.new }
      let!(:article) { create(:article, pageid: 2364730, title: 'Yankari Game Reserve') }
      let!(:article_timepoint) do
        create(:article_timepoint, article:, timestamp: Date.new(2001, 1, 1))
      end

      it 'captures revision_id', vcr: false do
        article_stats_service.update_first_revision_info(article:)
        expect do
          article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
        end.to raise_error(ImpactVisualizerErrors::ArticleCreatedAfterTimestamp)
      end
    end
  end

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

      article_stats_service = described_class.new
      article_stats_service.update_stats_for_topic_article_timepoint(
        topic_article_timepoint: end_topic_article_timepoint_1
      )
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.length_delta).to eq(100)
    end

    it 'updates length_delta even if no previous article_timpoint' do
      # Reset length_delta so we can test it being updated
      start_topic_article_timepoint_1.update length_delta: nil

      article_stats_service = described_class.new

      article_stats_service.update_stats_for_topic_article_timepoint(
        topic_article_timepoint: start_topic_article_timepoint_1
      )
      start_topic_article_timepoint_1.reload
      expect(start_topic_article_timepoint_1.length_delta).to eq(0)
    end

    it 'updates revisions_count_delta' do
      # Reset length_delta so we can test it being updated
      end_topic_article_timepoint_1.update revisions_count_delta: nil

      article_stats_service = described_class.new
      article_stats_service.update_stats_for_topic_article_timepoint(
        topic_article_timepoint: end_topic_article_timepoint_1
      )
      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.revisions_count_delta).to eq(2)
    end

    it 'updates attributed_creation_at and attributed_creator' do
      user = create(:user, wiki_user_id: 123)
      create(:topic_user, user:, topic:)

      first_revision_at = Time.zone.now
      article_1.update(first_revision_by_id: 123, first_revision_at:)

      article_stats_service = described_class.new
      article_stats_service.update_stats_for_topic_article_timepoint(
        topic_article_timepoint: start_topic_article_timepoint_1
      )
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

      article_stats_service = described_class.new
      article_stats_service.update_stats_for_topic_article_timepoint(
        topic_article_timepoint: end_topic_article_timepoint_1
      )

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

      article_stats_service = described_class.new
      article_stats_service.update_stats_for_topic_article_timepoint(
        topic_article_timepoint: end_topic_article_timepoint_1
      )

      end_topic_article_timepoint_1.reload
      expect(end_topic_article_timepoint_1.attributed_length_delta).to eq(8575)
      expect(end_topic_article_timepoint_1.attributed_revisions_count_delta).to eq(1)
    end
  end

  describe '#update_article_details' do
    it 'captures pageid given title', :vcr do
      article = create(:article, pageid: nil, title: 'Yankari Game Reserve')
      article_stats_service = described_class.new
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.pageid).to eq(2364730)
    end

    it 'captures title given pageid', :vcr do
      article = create(:article, pageid: 2364730, title: nil)
      article_stats_service = described_class.new
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.title).to eq('Yankari Game Reserve')
    end

    it 'captures first revision details', :vcr do
      article = create(:article, pageid: 2364730, first_revision_id: nil)
      article_stats_service = described_class.new
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.first_revision_id).to eq(20142847)
      expect(article.first_revision_at).to eq('2005-08-02 21:43:23')
      expect(article.first_revision_by_name).to eq('Jamie7687')
      expect(article.first_revision_by_id).to eq(311307)
    end
  end
end
