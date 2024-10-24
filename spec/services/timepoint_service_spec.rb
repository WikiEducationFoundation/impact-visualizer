# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe TimepointService do
  describe '.initialize' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { Date.new(2023, 1, 30) }
    let(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval: 7) }

    it 'initializes and has @topic variable' do
      timepoint_service = described_class.new(topic:)
      expect(timepoint_service).to be_a(described_class)
      expect(timepoint_service.topic).to eq(topic)
    end

    it 'initializes with Topic wiki' do
      wiki = Wiki.create language: 'de', project: 'wikipedia'
      topic.update(wiki:)
      expect_any_instance_of(ArticleStatsService).to receive(:initialize).with(wiki)
      timepoint_service = described_class.new(topic:)
      expect(timepoint_service).to be_a(described_class)
      expect(timepoint_service.topic).to eq(topic)
    end
  end

  describe '#build_timepoints' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { Date.new(2023, 1, 30) }
    let(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval: 7) }

    before do
      allow_any_instance_of(ArticleStatsService).to(
        receive(:update_stats_for_article_timepoint)
      )
      allow_any_instance_of(ArticleStatsService).to(
        receive(:update_details_for_article)
      )
      allow_any_instance_of(TopicArticleTimepointStatsService).to(
        receive(:update_stats_for_topic_article_timepoint)
      )
      allow_any_instance_of(TopicArticleTimepointStatsService).to(
        receive(:update_token_stats)
      )
      allow_any_instance_of(TopicTimepointStatsService).to(
        receive(:update_stats_for_topic_timepoint)
      )
    end

    it 'builds all timepoints for Topic' do
      article_bag = create(:small_article_bag, topic:)

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      counter = instance_double('counter')
      total_progress_steps = (topic_timepoints_count * 2) + article_count
      expect(counter).to receive(:total).once.with(total_progress_steps)
      expect(counter).to receive(:at).exactly(total_progress_steps).times

      timepoint_service = described_class.new(
        topic:,
        total: counter.method(:total),
        at: counter.method(:at)
      )
      timepoint_service.build_timepoints

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

      expect(TopicTimepoint.count).to eq(topic_timepoints_count + 2)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count + article_count + 4)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count + article_count + 4)
    end

    it 'skips articles that were created after timepoint' do
      article_bag = create(:small_article_bag, topic:)

      # Make one Article newer than the others
      # If first_revision_at is after end_date, it should not be included
      first_article = article_bag.articles.first
      first_article.update first_revision_at: end_date + 1.week

      timepoint_service = described_class.new(topic:)
      timepoint_service.build_timepoints

      topic_timepoints_count = topic.timestamps.count

      # Subtract the newer Article from count
      article_count = article_bag.articles.count - 1
      article_timepoint_count = topic_timepoints_count * article_count
      topic_article_timepoint_count = topic_timepoints_count * article_count

      expect(TopicTimepoint.count).to eq(topic_timepoints_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count)
    end

    it 'does NOT update details for Article, force_updates=false' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count

      expect_any_instance_of(ArticleStatsService).not_to(
        receive(:update_details_for_article)
      )

      timepoint_service.build_timepoints
    end

    it 'updates details for Article, force_updates=TRUE' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:, force_updates: true)

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

    it 'calls update_token_stats for each Article' do
      create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)
      expect(timepoint_service).to receive(:update_token_stats).once
      timepoint_service.build_timepoints
    end

    it 'updates stats for ArticleTimepoints/TopicArticleTimepoints, force_updates=TRUE' do
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

      call_count = 0
      allow_any_instance_of(TopicArticleTimepointStatsService).to(
        receive(:update_stats_for_topic_article_timepoint) { call_count += 1 }
      )

      expect_any_instance_of(TopicTimepointStatsService).to(
        receive(:update_stats_for_topic_timepoint)
          .exactly(topic_timepoints_count).times
          .with(
            topic_timepoint: kind_of(TopicTimepoint)
          )
      )

      timepoint_service.build_timepoints

      expect(call_count).to eq(article_timepoint_count)
    end

    it 'does not update stats for ArticleTimepoints/TopicArticleTimepoints, force_updates=FALSE' do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)

      # Run to capture initial
      timepoint_service.build_timepoints

      # Get ready to run again
      topic_timepoints_count = topic.timestamps.count

      expect_any_instance_of(ArticleStatsService).not_to(
        receive(:update_stats_for_article_timepoint)
      )

      expect_any_instance_of(TopicArticleTimepointStatsService).not_to(
        receive(:update_stats_for_topic_article_timepoint)
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

  describe '#update_token_stats' do
    # This shared context sets up 1 Topic with 2 Articles and 2 Timepoints
    include_context 'topic with two timepoints'

    before do
      allow_any_instance_of(WikiWhoApi).to(
        receive(:get_revision_tokens)
      ).and_return([])
    end

    it 'hands off to TopicTimepointStatsService for each article*timepont' do
      timepoint_service = described_class.new(topic:)

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count

      # subtract 1 because article_3 not around for first timepoint
      article_timepoint_count = (topic_timepoints_count * article_count) - 1

      article_call_count = 0
      allow_any_instance_of(ArticleStatsService).to receive(:update_token_stats)
        .with(article_timepoint: kind_of(ArticleTimepoint), tokens: kind_of(Array)) do
          article_call_count += 1
        end

      topic_article_call_count = 0
      allow_any_instance_of(TopicArticleTimepointStatsService).to receive(:update_token_stats)
        .with(tokens: kind_of(Array)) do
          topic_article_call_count += 1
        end

      timepoint_service.update_token_stats
      expect(topic_article_call_count).to eq(article_timepoint_count)
      expect(article_call_count).to eq(article_timepoint_count)
    end
  end
end
