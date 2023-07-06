# frozen_string_literal: true

require 'rails_helper'

describe TimepointService do
  let(:start_date) { Date.new(2023, 1, 1) }
  let(:end_date) { Date.new(2023, 1, 30) }
  let(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval: 7) }

  describe '.initialize' do
    it 'initializes and has @topic variable' do
      timepoint_service = described_class.new(topic:)
      expect(timepoint_service).to be_a(described_class)
      expect(timepoint_service.topic).to eq(topic)
    end
  end

  describe '#build_timepoints' do
    before do
      allow_any_instance_of(ArticleStatsService).to(
        receive(:update_stats_for_article_timepoint)
      )
      allow_any_instance_of(ArticleStatsService).to(
        receive(:update_stats_for_topic_article_timepoint)
      )
      allow_any_instance_of(ArticleStatsService).to(
        receive(:update_details_for_article)
      )
      allow_any_instance_of(TopicTimepointStatsService).to(
        receive(:update_stats_for_topic_timepoint)
      )
    end

    it 'builds all timepoints for Topic' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)
      timepoint_service.build_timepoints

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      expect(TopicTimepoint.count).to eq(topic_timepoints_count)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count)
    end

    it 'uses all existing timepoints for Topic' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)
      timepoint_service.build_timepoints

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      timepoint_service.build_timepoints

      expect(TopicTimepoint.count).to eq(topic_timepoints_count)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count)
    end

    it 'uses both existing and new timepoints for Topic' do
      article_bag = create(:small_article_bag, topic:)

      timepoint_service = described_class.new(topic:)
      timepoint_service.build_timepoints

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      topic.update end_date: end_date + 7.days
      timepoint_service.build_timepoints

      expect(TopicTimepoint.count).to eq(topic_timepoints_count + 1)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count + article_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count + article_count)
    end

    it 'updates details for Article' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count

      expect_any_instance_of(ArticleStatsService).to(
        receive(:update_details_for_article)
          .exactly(topic_article_timepoint_count).times
          .with(
            article: kind_of(Article)
          )
      )

      timepoint_service.build_timepoints
    end

    it 'updates stats for ArticleTimepoints and TopicArticleTimepoints' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      article_timepoint_count = topic_timepoints_count * article_count

      expect_any_instance_of(ArticleStatsService).to(
        receive(:update_stats_for_article_timepoint)
          .exactly(article_timepoint_count).times
          .with(
            article_timepoint: kind_of(ArticleTimepoint)
          )
      )

      expect_any_instance_of(ArticleStatsService).to(
        receive(:update_stats_for_topic_article_timepoint)
          .exactly(article_timepoint_count).times
          .with(
            topic_article_timepoint: kind_of(TopicArticleTimepoint)
          )
      )

      expect_any_instance_of(TopicTimepointStatsService).to(
        receive(:update_stats_for_topic_timepoint)
          .exactly(topic_timepoints_count).times
          .with(
            topic_timepoint: kind_of(TopicTimepoint)
          )
      )

      timepoint_service.build_timepoints
    end
  end
end
