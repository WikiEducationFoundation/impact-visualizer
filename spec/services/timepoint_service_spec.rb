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

  describe '#incremental_build' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { Date.new(2023, 1, 30) }
    let!(:topic) { create(:topic, start_date:, end_date:, timepoint_day_interval: 7) }
    let!(:article_bag) { create(:small_article_bag, topic:) }
    let!(:topic_timepoints_count) { topic.timestamps.count }
    let!(:article_count) { article_bag.articles.count }
    let!(:topic_article_timepoint_count) { topic_timepoints_count * article_count }
    let!(:article_timepoint_count) { topic_timepoints_count * article_count }

    context 'without queue_next_stage' do
      it 'runs classify stage', vcr: true do
        # 4 articles
        # 6 timestamps
        # classify_all_articles = 4
        counter = instance_double('counter')
        expect(counter).to receive(:total).once.with(4)
        expect(counter).to receive(:at).exactly(4).times

        timepoint_service = described_class.new(
          topic:,
          total: counter.method(:total),
          at: counter.method(:at)
        )

        expect_any_instance_of(ClassificationService).to receive(:classify_all_articles).and_call_original
        timepoint_service.incremental_build(:classify)
      end

      it 'runs article_timepoints stage', :vcr do
        # 4 articles
        # 6 timestamps
        # build_timepoints_for_timestamp = 4 * 6 = 24

        counter = instance_double('counter')
        expect(counter).to receive(:total).once.with(24)
        expect(counter).to receive(:at).exactly(24).times

        timepoint_service = described_class.new(
          topic:,
          total: counter.method(:total),
          at: counter.method(:at)
        )

        expect_any_instance_of(described_class).to receive(:build_timepoints_for_all_timestamps).and_call_original
        timepoint_service.incremental_build(:article_timepoints)
      end

      it 'runs tokens stage' do
        # 4 articles
        # 6 timestamps
        # update_token_stats = 4

        counter = instance_double('counter')
        expect(counter).to receive(:total).once.with(4)
        expect(counter).to receive(:at).exactly(4).times

        timepoint_service = described_class.new(topic:, total: counter.method(:total), at: counter.method(:at))
        expect_any_instance_of(described_class).to receive(:update_token_stats).and_call_original
        timepoint_service.incremental_build(:tokens)
      end

      it 'runs topic_timepoints stage' do
        # 6 timestamps
        counter = instance_double('counter')
        expect(counter).to receive(:total).once.with(6)
        expect(counter).to receive(:at).exactly(6).times

        timepoint_service = described_class.new(topic:, total: counter.method(:total), at: counter.method(:at))
        expect_any_instance_of(described_class).to receive(:build_topic_timepoints).and_call_original
        timepoint_service.incremental_build(:topic_timepoints)
      end

      it 'raises error for invalid stage' do
        timepoint_service = described_class.new(topic:)
        expect { timepoint_service.incremental_build(:invalid_stage) }.to raise_error(ArgumentError)
      end
    end

    context 'with queue_next_stage=true' do
      it 'runs classify stage', :vcr do
        timepoint_service = described_class.new(topic:)
        expect_any_instance_of(ClassificationService).to receive(:classify_all_articles).and_call_original
        expect(IncrementalTopicBuildJob).to receive(:perform_async).with(
          topic.id,
          'article_timepoints',
          true,
          false
        )
        timepoint_service.incremental_build(:classify, queue_next_stage: true)
      end

      it 'runs article_timepoints stage', :vcr do
        timepoint_service = described_class.new(topic:)
        expect_any_instance_of(described_class).to receive(:build_timepoints_for_all_timestamps).and_call_original
        expect(IncrementalTopicBuildJob).to receive(:perform_async).with(
          topic.id,
          'tokens',
          true,
          false
        )
        timepoint_service.incremental_build(:article_timepoints, queue_next_stage: true)
      end

      it 'runs tokens stage' do
        timepoint_service = described_class.new(topic:)
        expect_any_instance_of(described_class).to receive(:update_token_stats).and_call_original
        expect(IncrementalTopicBuildJob).to receive(:perform_async).with(
          topic.id,
          'topic_timepoints',
          true,
          false
        )
        timepoint_service.incremental_build(:tokens, queue_next_stage: true)
      end

      it 'runs topic_timepoints stage' do
        timepoint_service = described_class.new(topic:)
        expect_any_instance_of(described_class).to receive(:build_topic_timepoints).and_call_original
        expect(IncrementalTopicBuildJob).not_to receive(:perform_async)
        timepoint_service.incremental_build(:topic_timepoints, queue_next_stage: true)
      end

      it 'raises error for invalid stage' do
        timepoint_service = described_class.new(topic:)
        expect { timepoint_service.incremental_build(:invalid_stage, queue_next_stage: true) }.to raise_error(ArgumentError)
      end
    end

    context 'full flow' do
      it 'runs classify, article_timepoints, tokens, topic_timepoints' do
        Sidekiq::Testing.inline!

        # Create a service instance to track
        timepoint_service = described_class.new(topic:, force_updates: true)
        allow(described_class).to receive(:new).and_return(timepoint_service)

        # Set up expectations for incremental_build to be called in sequence
        expect(timepoint_service).to receive(:incremental_build)
          .with(:classify, queue_next_stage: true).ordered.and_call_original
        expect(timepoint_service).to receive(:incremental_build)
          .with(:article_timepoints, queue_next_stage: true).ordered.and_call_original
        expect(timepoint_service).to receive(:incremental_build)
          .with(:tokens, queue_next_stage: true).ordered.and_call_original
        expect(timepoint_service).to receive(:incremental_build)
          .with(:topic_timepoints, queue_next_stage: true).ordered.and_call_original

        # Allow the implementation methods to be called in any order
        allow(timepoint_service).to receive(:classify_all_articles)
        allow(timepoint_service).to receive(:build_timepoints_for_all_timestamps)
        allow(timepoint_service).to receive(:update_token_stats)
        allow(timepoint_service).to receive(:build_topic_timepoints)

        queue_next_stage = true
        force_updates = true
        IncrementalTopicBuildJob.perform_async(topic.id, 'classify', queue_next_stage, force_updates)
      end
    end
  end

  describe '#full_timepoint_build' do
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

    it 'builds all timepoints for Topic', :vcr do
      article_bag = create(:small_article_bag, topic:)

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      # 4 articles
      # 6 timestamps

      # classify_all_articles = 4
      # build_timepoints_for_timestamp = 4 * 6 = 24
      # update_token_stats = 4
      # build_topic_timepoints = 6
      # Total = 4 + 24 + 4 + 6 = 38

      total_progress_steps = article_count +
                             (article_count * topic_timepoints_count) +
                             article_count +
                             topic_timepoints_count
      expect(total_progress_steps).to eq(38)

      counter = instance_double('counter')
      expect(counter).to receive(:total).once.with(total_progress_steps)
      expect(counter).to receive(:at).exactly(total_progress_steps).times

      expect_any_instance_of(ClassificationService).to receive(:classify_all_articles).and_call_original

      expect_any_instance_of(described_class).to(
        receive(:build_timepoints_for_all_timestamps)
          .and_call_original
      )

      expect_any_instance_of(described_class).to(
        receive(:build_timepoints_for_timestamp)
          .exactly(topic_timepoints_count).times
          .and_call_original
      )

      timepoint_service = described_class.new(
        topic:,
        total: counter.method(:total),
        at: counter.method(:at)
      )
      timepoint_service.full_timepoint_build

      expect(TopicTimepoint.count).to eq(topic_timepoints_count)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count)
    end

    it 'uses all existing timepoints for Topic', :vcr do
      article_bag = create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)
      timepoint_service.full_timepoint_build

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      timepoint_service.full_timepoint_build

      expect(TopicTimepoint.count).to eq(topic_timepoints_count)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count)
    end

    it 'uses both existing and new timepoints for Topic', :vcr do
      article_bag = create(:small_article_bag, topic:)

      timepoint_service = described_class.new(topic:)
      timepoint_service.full_timepoint_build

      topic_timepoints_count = topic.timestamps.count
      article_count = article_bag.articles.count
      topic_article_timepoint_count = topic_timepoints_count * article_count
      article_timepoint_count = topic_timepoints_count * article_count

      topic.update end_date: end_date + 7.days
      timepoint_service.full_timepoint_build

      expect(TopicTimepoint.count).to eq(topic_timepoints_count + 2)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count + article_count + 4)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count + article_count + 4)
    end

    it 'skips articles that were created after timepoint', :vcr do
      article_bag = create(:small_article_bag, topic:)

      # Make one Article newer than the others
      # If first_revision_at is after end_date, it should not be included
      first_article = article_bag.articles.first
      first_article.update first_revision_at: end_date + 1.week

      timepoint_service = described_class.new(topic:)
      timepoint_service.full_timepoint_build

      topic_timepoints_count = topic.timestamps.count

      # Subtract the newer Article from count
      article_count = article_bag.articles.count - 1
      article_timepoint_count = topic_timepoints_count * article_count
      topic_article_timepoint_count = topic_timepoints_count * article_count

      expect(TopicTimepoint.count).to eq(topic_timepoints_count)
      expect(ArticleTimepoint.count).to eq(article_timepoint_count)
      expect(TopicArticleTimepoint.count).to eq(topic_article_timepoint_count)
    end

    it 'does NOT update details for Article, force_updates=false', :vcr do
      create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)

      expect_any_instance_of(ArticleStatsService).not_to(
        receive(:update_details_for_article)
      )

      timepoint_service.full_timepoint_build
    end

    it 'updates details for Article, force_updates=TRUE', :vcr do
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

      timepoint_service.full_timepoint_build
    end

    it 'calls update_token_stats for each Article', :vcr do
      create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)
      expect(timepoint_service).to receive(:update_token_stats).once
      timepoint_service.full_timepoint_build
    end

    it 'updates stats for ArticleTimepoints/TopicArticleTimepoints, force_updates=TRUE', :vcr do
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

      timepoint_service.full_timepoint_build

      expect(call_count).to eq(article_timepoint_count)
    end

    it 'does not update stats for ArticleTimepoints/TopicArticleTimepoints, ' \
       'force_updates=FALSE', :vcr do
      create(:small_article_bag, topic:)
      timepoint_service = described_class.new(topic:)

      # Run to capture initial
      timepoint_service.full_timepoint_build

      # A fully-completed build leaves every timepoint marked done. Mark them
      # explicitly so the "re-run skips completed work" assertion doesn't
      # depend on whether the recorded cassette left any timepoint stranded
      # (a stranded one would be correctly re-filled on the next pass).
      ArticleTimepoint.update_all(stats_complete: true)

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

      timepoint_service.full_timepoint_build
    end
  end

  describe '#build_timepoints_for_timestamp (resume skip)' do
    let(:topic) do
      create(:topic, start_date: Date.new(2023, 1, 1), end_date: Date.new(2023, 1, 30),
                     timepoint_day_interval: 7)
    end
    let(:timestamp) { Date.new(2023, 1, 8) }
    let(:service) { described_class.new(topic:) }
    let(:article_done) { create(:article, pageid: 11, title: 'Already built', first_revision_at: Date.new(2020, 1, 1)) }
    let(:article_todo) { create(:article, pageid: 22, title: 'Not yet built', first_revision_at: Date.new(2020, 1, 1)) }
    # Postdates the timestamp — never had a timepoint, never will.
    let(:article_future) { create(:article, pageid: 33, title: 'Created later', first_revision_at: Date.new(2024, 1, 1)) }

    before do
      bag = topic.active_article_bag
      create(:article_bag_article, article: article_done, article_bag: bag)
      create(:article_bag_article, article: article_todo, article_bag: bag)
      create(:article_bag_article, article: article_future, article_bag: bag)

      # article_done already has a fully-built timepoint for this timestamp.
      tt = TopicTimepoint.create!(topic:, timestamp:)
      at = ArticleTimepoint.create!(article: article_done, timestamp:, revision_id: 555)
      TopicArticleTimepoint.create!(article_timepoint: at, topic_timepoint: tt)
    end

    it 'only processes articles that existed and are not already built' do
      processed = []
      allow(service).to receive(:build_timepoints_for_article) do |article_bag_article:, **|
        processed << article_bag_article.article_id
      end
      service.build_timepoints_for_timestamp(timestamp:)
      # article_done is skipped (built); article_future is skipped (didn't exist
      # yet); only article_todo remains.
      expect(processed).to eq([article_todo.id])
    end

    it 'processes everything when force_updates is set' do
      service = described_class.new(topic:, force_updates: true)
      processed = []
      allow(service).to receive(:build_timepoints_for_article) do |article_bag_article:, **|
        processed << article_bag_article.article_id
      end
      service.build_timepoints_for_timestamp(timestamp:)
      expect(processed).to contain_exactly(article_done.id, article_todo.id, article_future.id)
    end
  end

  describe '#build_timepoints_for_article (idempotency / retry cost)' do
    let(:topic) do
      create(:topic, start_date: Date.new(2023, 1, 1), end_date: Date.new(2023, 1, 30),
                     timepoint_day_interval: 7)
    end
    let(:article) { create(:article) }
    let(:article_bag_article) do
      create(:article_bag_article, article:, article_bag: topic.active_article_bag)
    end
    let(:timestamp) { Date.new(2023, 1, 8) }
    let(:topic_timepoint) { TopicTimepoint.create!(topic:, timestamp:) }
    let(:service) { described_class.new(topic:) }

    before do
      @article_fills = 0
      @topic_article_fills = 0
      allow_any_instance_of(ArticleStatsService).to receive(:update_details_for_article)
      allow_any_instance_of(ArticleStatsService).to(
        receive(:update_stats_for_article_timepoint) { @article_fills += 1 }
      )
      allow_any_instance_of(TopicArticleTimepointStatsService).to(
        receive(:update_stats_for_topic_article_timepoint) { @topic_article_fills += 1 }
      )
    end

    def build!
      service.build_timepoints_for_article(article_bag_article:, topic_timepoint:)
    end

    it 'fills stats for a brand-new timepoint' do
      build!
      expect(@article_fills).to eq(1)
      expect(@topic_article_fills).to eq(1)
    end

    it 'skips a fully-built timepoint on re-run (cheap retry)' do
      at = ArticleTimepoint.create!(article:, timestamp:, revision_id: 999)
      TopicArticleTimepoint.create!(article_timepoint: at, topic_timepoint:, attributed_length_delta: 0)
      build!
      expect(@article_fills).to eq(0)
      expect(@topic_article_fills).to eq(0)
    end

    it 're-fills an article timepoint stranded without stats by an interrupted run' do
      at = ArticleTimepoint.create!(article:, timestamp:, revision_id: nil)
      TopicArticleTimepoint.create!(article_timepoint: at, topic_timepoint:, attributed_length_delta: 0)
      build!
      expect(@article_fills).to eq(1)        # re-filled rather than skipped forever
      expect(@topic_article_fills).to eq(1)  # dependent deltas refreshed in lockstep
    end

    it 'skips a deleted/hidden timepoint already marked complete (nil revision_id)' do
      at = ArticleTimepoint.create!(article:, timestamp:, revision_id: nil, stats_complete: true)
      TopicArticleTimepoint.create!(article_timepoint: at, topic_timepoint:, attributed_length_delta: 0)
      build!
      expect(@article_fills).to eq(0)        # stats_complete marker prevents a re-fetch
      expect(@topic_article_fills).to eq(0)
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

    context 'with the revision-id gate' do
      # Latest revision_id used by the end_article_timepoint_* records.
      let(:latest_revision_id) { 1084581512 }
      let(:fetch_count) { Concurrent::AtomicFixnum.new(0) }

      before do
        # Existing TopicArticleAnalytic rows would normally be created by
        # GenerateArticleAnalyticsJob. The token-skip gate uses these per-
        # (topic, article) rows to record which revision_id was processed.
        [article_1, article_2, article_3].each do |article|
          TopicArticleAnalytic.create!(topic:, article:, average_daily_views: 0)
        end

        # Count WikiWho fetches via a thread-safe counter; `update_token_stats`
        # runs articles in parallel and `expect_any_instance_of(...).to receive`
        # is not race-safe under that.
        allow_any_instance_of(WikiWhoApi).to receive(:get_revision_tokens) do
          fetch_count.increment
          []
        end
      end

      it 'skips the WikiWho fetch when tokens_revision_id is current' do
        TopicArticleAnalytic.where(topic:).update_all(tokens_revision_id: latest_revision_id)

        described_class.new(topic:).update_token_stats

        expect(fetch_count.value).to eq(0)
      end

      it 'fetches and records the marker when tokens_revision_id is nil' do
        described_class.new(topic:).update_token_stats

        expect(fetch_count.value).to eq(article_bag.articles.count)
        expect(
          TopicArticleAnalytic.where(topic:).pluck(:tokens_revision_id)
        ).to all(eq(latest_revision_id))
      end

      it 're-fetches and re-records when the latest revision has changed' do
        TopicArticleAnalytic.where(topic:).update_all(tokens_revision_id: 1)

        described_class.new(topic:).update_token_stats

        expect(fetch_count.value).to eq(article_bag.articles.count)
        expect(
          TopicArticleAnalytic.where(topic:).pluck(:tokens_revision_id)
        ).to all(eq(latest_revision_id))
      end

      it 'bypasses the gate when force_updates is true' do
        TopicArticleAnalytic.where(topic:).update_all(tokens_revision_id: latest_revision_id)

        described_class.new(topic:, force_updates: true).update_token_stats

        expect(fetch_count.value).to eq(article_bag.articles.count)
      end
    end

    context 'with the tokens_unavailable filter' do
      let(:fetch_count) { Concurrent::AtomicFixnum.new(0) }

      before do
        [article_1, article_2, article_3].each do |article|
          TopicArticleAnalytic.create!(topic:, article:, average_daily_views: 0)
        end

        allow_any_instance_of(WikiWhoApi).to receive(:get_revision_tokens) do
          fetch_count.increment
          []
        end
      end

      it 'marks tokens_unavailable=true and skips the per-timestamp loop ' \
         'when WikiWho returns nil' do
        allow_any_instance_of(WikiWhoApi).to receive(:get_revision_tokens) do
          fetch_count.increment
          nil
        end
        expect_any_instance_of(ArticleStatsService).not_to receive(:update_token_stats)

        described_class.new(topic:).update_token_stats

        expect(fetch_count.value).to eq(article_bag.articles.count)
        expect(
          TopicArticleAnalytic.where(topic:).pluck(:tokens_unavailable).uniq
        ).to eq([true])
      end

      it 'filters previously-flagged articles out of the parallel loop' do
        TopicArticleAnalytic.where(topic:, article: article_1)
          .update_all(tokens_unavailable: true)

        described_class.new(topic:).update_token_stats

        # WikiWho is hit for the remaining articles only.
        expect(fetch_count.value).to eq(article_bag.articles.count - 1)
      end

      it 'bypasses the tokens_unavailable filter when force_updates is true' do
        TopicArticleAnalytic.where(topic:).update_all(tokens_unavailable: true)

        described_class.new(topic:, force_updates: true).update_token_stats

        expect(fetch_count.value).to eq(article_bag.articles.count)
      end

      it 'clears tokens_unavailable on a subsequent successful fetch' do
        TopicArticleAnalytic.where(topic:, article: article_1)
          .update_all(tokens_unavailable: true)

        # force_updates lets the previously-flagged article through and
        # WikiWho now returns a real (non-nil) result.
        described_class.new(topic:, force_updates: true).update_token_stats

        expect(
          TopicArticleAnalytic.where(topic:).pluck(:tokens_unavailable).uniq
        ).to eq([false])
      end
    end
  end
end
