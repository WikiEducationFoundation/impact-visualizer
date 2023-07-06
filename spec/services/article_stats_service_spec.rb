# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe ArticleStatsService do
  describe '#update_stats_for_article_timepoint' do
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

    it 'updates attributed_creation_at and attributed_creator'
    it 'updates attributed_length_delta'
    it 'updates attributed_revisions_count_delta'
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
