# frozen_string_literal: true

require 'rails_helper'

describe ArticleStatsService do
  describe '#update_stats_for_article_timepoint' do
    it 'updates article_length using Wiki API' do
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
    it 'updates length_delta'
    it 'updates links_count_delta'
    it 'updates revisions_count_delta'
    it 'updates attributed_creation_at and attributed_creator'
    it 'updates attributed_length_delta'
    it 'updates attributed_links_count_delta'
    it 'updates attributed_revisions_count_delta'
  end
end
