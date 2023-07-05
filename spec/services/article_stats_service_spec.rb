# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe ArticleStatsService do
  describe '#update_stats_for_article_timepoint' do
    it 'updates article_length using Wiki API', :vcr do
      article_stats_service = described_class.new
      article = create(:article, pageid: 2364730)
      article_timepoint = create(:article_timepoint, article:, timestamp: Date.new(2023, 1, 1))
      article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
      article_timepoint.reload
      expect(article_timepoint.revision_id).to be > 0
      expect(article_timepoint.article_length).to be > 0
    end

    it 'updates revisions_count'
    it 'updates links_count'
  end

  describe '#update_stats_for_topic_article_timepoint' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

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

    it 'updates links_count_delta'
    it 'updates revisions_count_delta'
    it 'updates attributed_creation_at and attributed_creator'
    it 'updates attributed_length_delta'
    it 'updates attributed_links_count_delta'
    it 'updates attributed_revisions_count_delta'
  end
end
