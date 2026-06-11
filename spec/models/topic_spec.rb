# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Topic do
  it { is_expected.to have_many(:article_bags) }
  it { is_expected.to have_many(:articles).through(:article_bags) }
  it { is_expected.to have_many(:topic_users) }
  it { is_expected.to have_many(:users).through(:topic_users) }
  it { is_expected.to have_many(:topic_timepoints) }
  it { is_expected.to have_many(:topic_summaries) }
  it { is_expected.to have_many(:topic_editor_topics) }
  it { is_expected.to have_many(:topic_editors).through(:topic_editor_topics) }
  it { is_expected.to belong_to(:wiki) }

  describe 'validations' do
    it 'is invalid when end_date is before start_date' do
      topic = build(:topic, start_date: Date.new(2023, 6, 1), end_date: Date.new(2023, 1, 1))
      expect(topic).not_to be_valid
      expect(topic.errors[:end_date]).to include('must not be before the start date')
    end

    it 'is valid when end_date equals start_date' do
      topic = build(:topic, start_date: Date.new(2023, 1, 1), end_date: Date.new(2023, 1, 1))
      expect(topic).to be_valid
    end

    it 'is valid when start_date and end_date are blank' do
      topic = build(:topic, start_date: nil, end_date: nil)
      expect(topic).to be_valid
    end
  end

  describe 'job status methods' do
    let(:topic) { create(:topic) }

    it 'returns user import status' do
      expect(topic.users_import_status).to eq(:idle)
      topic.update users_import_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:status).with('abc').and_return(:working)
      expect(topic.users_import_status).to eq(:working)
    end

    it 'returns user import percent complete' do
      expect(topic.users_import_percent_complete).to be_nil
      topic.update users_import_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:pct_complete).with('abc').and_return(30)
      expect(topic.users_import_percent_complete).to eq(30)
    end

    it 'returns articles import status' do
      expect(topic.articles_import_status).to eq(:idle)
      topic.update article_import_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:status).with('abc').and_return(:working)
      expect(topic.articles_import_status).to eq(:working)
    end

    it 'returns articles import percent complete' do
      expect(topic.articles_import_percent_complete).to be_nil
      topic.update article_import_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:pct_complete).with('abc').and_return(30)
      expect(topic.articles_import_percent_complete).to eq(30)
    end

    it 'returns timepoint generate status' do
      expect(topic.timepoint_generate_status).to eq(:idle)
      topic.update timepoint_generate_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:status).with('abc').and_return(:working)
      expect(topic.timepoint_generate_status).to eq(:working)
    end

    it 'returns timepoint generate percent complete' do
      expect(topic.timepoint_generate_percent_complete).to be_nil
      topic.update timepoint_generate_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:pct_complete).with('abc').and_return(30)
      expect(topic.timepoint_generate_percent_complete).to eq(30)
    end

    it 'returns incremental topic build status' do
      expect(topic.incremental_topic_build_status).to eq(:idle)
      topic.update incremental_topic_build_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:status).with('abc').and_return(:working)
      expect(topic.incremental_topic_build_status).to eq(:working)
    end

    it 'returns incremental topic build percent complete' do
      expect(topic.incremental_topic_build_percent_complete).to be_nil
      topic.update incremental_topic_build_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:pct_complete).with('abc').and_return(30)
      expect(topic.incremental_topic_build_percent_complete).to eq(30)
    end

    it 'returns incremental topic build stage' do
      expect(topic.incremental_topic_build_stage).to be_nil
      topic.update incremental_topic_build_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:get).with('abc', :stage).and_return('classify')
      expect(topic.incremental_topic_build_stage).to eq('classify')
    end

    it 'returns incremental topic build stage message' do
      expect(topic.incremental_topic_build_stage_message).to eq('')
      topic.update incremental_topic_build_job_id: 'abc'
      expect(Sidekiq::Status).to receive(:get).with('abc', :stage).and_return('classify')
      expect(topic.incremental_topic_build_stage_message).to eq('Stage 1/4 (classify)')
    end
  end

  describe 'CSV instance methods' do
    let(:topic) { create(:topic) }

    before do
      topic.articles_csv.attach(
        io: File.open('spec/fixtures/csv/topic-articles-test.csv'),
        filename: 'topic-articles-test.csv'
      )

      topic.users_csv.attach(
        io: File.open('spec/fixtures/csv/topic-users-test.csv'),
        filename: 'topic-users-test.csv'
      )
    end

    it 'returns users_csv_filename' do
      expect(topic.users_csv_filename).to eq('topic-users-test.csv')
    end

    it 'returns articles_csv_filename' do
      expect(topic.articles_csv_filename).to eq('topic-articles-test.csv')
    end

    it 'returns users_csv_url' do
      expect(topic.users_csv_url).to include('topic-users-test.csv')
      expect(topic.users_csv_url).to include('/rails/active_storage/blobs/redirect')
    end

    it 'returns articles_csv_url' do
      expect(topic.articles_csv_url).to include('topic-articles-test.csv')
      expect(topic.articles_csv_url).to include('/rails/active_storage/blobs/redirect')
    end
  end

  describe '#queue_generate_timepoints' do
    let(:topic) { create(:topic) }

    it 'queues GenerateTimepointsJob for Topic' do
      expect(GenerateTimepointsJob).to receive(:perform_async).and_return('abc123')
      topic.queue_generate_timepoints
      expect(topic.reload.timepoint_generate_job_id).to eq('abc123')
    end
  end

  describe '#queue_incremental_topic_build' do
    let(:topic) { create(:topic) }

    it 'queues IncrementalTopicBuildJob for Topic, defaults' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'classify', true, false, false)
        .and_return('abc123')
      topic.queue_incremental_topic_build
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end

    it 'queues IncrementalTopicBuildJob for Topic, with force_updates' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'classify', true, true, false)
        .and_return('abc123')
      topic.queue_incremental_topic_build(force_updates: true)
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end

    it 'queues IncrementalTopicBuildJob for Topic, with stage' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'tokens', true, false, false)
        .and_return('abc123')
      topic.queue_incremental_topic_build(stage: 'tokens')
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end

    it 'queues IncrementalTopicBuildJob for Topic, with stage and force_updates' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'tokens', true, true, false)
        .and_return('abc123')
      topic.queue_incremental_topic_build(stage: 'tokens', force_updates: true)
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end

    it 'queues IncrementalTopicBuildJob for Topic, with stage and queue_next_stage' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'tokens', false, false, false)
        .and_return('abc123')
      topic.queue_incremental_topic_build(stage: 'tokens', queue_next_stage: false)
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end

    it 'queues IncrementalTopicBuildJob for Topic, with attribution_only' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'article_timepoints', true, false, true)
        .and_return('abc123')
      topic.queue_incremental_topic_build(stage: 'article_timepoints', attribution_only: true)
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end
  end

  describe '#queue_attribution_rebuild' do
    let(:topic) { create(:topic) }

    it 'queues an attribution_only build entered at :article_timepoints' do
      expect(IncrementalTopicBuildJob).to receive(:perform_async)
        .with(topic.id, 'article_timepoints', true, false, true)
        .and_return('abc123')
      topic.queue_attribution_rebuild
      expect(topic.reload.incremental_topic_build_job_id).to eq('abc123')
    end
  end

  describe '#queue_articles_import' do
    let(:topic) { create(:topic) }

    it 'queues ImportArticlesJob for Topic' do
      expect(ImportArticlesJob).to receive(:perform_async).and_return('abc123')
      topic.queue_articles_import
      expect(topic.reload.article_import_job_id).to eq('abc123')
    end
  end

  describe '#queue_users_import' do
    let(:topic) { create(:topic) }

    it 'queues ImportUsersJob for Topic' do
      expect(ImportUsersJob).to receive(:perform_async).and_return('abc123')
      topic.queue_users_import
      expect(topic.reload.users_import_job_id).to eq('abc123')
    end
  end

  describe '#data_generation_in_progress?' do
    let(:topic) { create(:topic) }

    it 'is false when no jobs are recorded' do
      expect(topic.data_generation_in_progress?).to be(false)
    end

    it 'is true when a recorded job is still queued' do
      topic.update(generate_article_analytics_job_id: 'jid-xyz')
      allow(Sidekiq::Status).to receive(:status).with('jid-xyz').and_return(:queued)
      expect(topic.data_generation_in_progress?).to be(true)
    end

    it 'is true when a recorded job is working and held by a worker' do
      topic.update(incremental_topic_build_job_id: 'jid-live')
      allow(Sidekiq::Status).to receive(:status).with('jid-live').and_return(:working)
      allow(described_class).to receive(:busy_job_ids).and_return(['jid-live'])
      expect(topic.data_generation_in_progress?).to be(true)
    end

    it 'is false when a job is frozen at :working but no worker holds it (killed mid-run)' do
      topic.update(incremental_topic_build_job_id: 'jid-dead')
      allow(Sidekiq::Status).to receive(:status).with('jid-dead').and_return(:working)
      allow(described_class).to receive(:busy_job_ids).and_return([])
      expect(topic.data_generation_in_progress?).to be(false)
    end

    it 'is false when the recorded job has reached a terminal status' do
      topic.update(incremental_topic_build_job_id: 'jid-done')
      allow(Sidekiq::Status).to receive(:status).with('jid-done').and_return(:complete)
      expect(topic.data_generation_in_progress?).to be(false)
    end

    it 'is false when the status hash has expired (unknown jid)' do
      topic.update(incremental_topic_build_job_id: 'jid-gone')
      allow(Sidekiq::Status).to receive(:status).with('jid-gone').and_return(nil)
      expect(topic.data_generation_in_progress?).to be(false)
    end
  end

  describe '.busy_job_ids' do
    # Sidekiq 7.3 WorkSet#each yields Sidekiq::Work objects (not Hashes);
    # the jid lives at work.job.jid. Exercise that real shape so the
    # extraction can't silently break again.
    it 'extracts jids from Sidekiq::Work items' do
      work = Sidekiq::Work.new(
        'host:1:abc', 'tid1',
        'queue' => 'timepoints',
        'run_at' => 0,
        'payload' => Sidekiq.dump_json('jid' => 'live-jid', 'class' => 'IncrementalTopicBuildJob')
      )
      allow(Sidekiq::Workers).to receive(:new).and_return([['host:1:abc', 'tid1', work]])
      expect(described_class.busy_job_ids).to eq(['live-jid'])
    end
  end

  describe '.job_alive?' do
    it 'fails safe (assumes alive) when the Sidekiq check raises' do
      allow(Sidekiq::Status).to receive(:status).and_raise(StandardError, 'redis down')
      expect(described_class.job_alive?('some-jid')).to be(true)
    end
  end

  describe '#data_generation_state' do
    let(:topic) { create(:topic) }

    it 'is :idle for a fresh topic with no data' do
      allow(topic).to receive(:most_recent_summary).and_return(nil)
      allow(topic).to receive(:article_analytics_exist?).and_return(false)
      expect(topic.data_generation_state).to eq(:idle)
    end

    it 'is :running while any phase is queued' do
      topic.update(article_import_job_id: 'jid-abc')
      allow(Sidekiq::Status).to receive(:status).with('jid-abc').and_return(:queued)
      expect(topic.data_generation_state).to eq(:running)
    end

    it 'is not :running when the recorded job has died (stale job_id)' do
      topic.update(incremental_topic_build_job_id: 'jid-dead')
      allow(Sidekiq::Status).to receive(:status).with('jid-dead').and_return(:working)
      allow(described_class).to receive(:busy_job_ids).and_return([])
      allow(topic).to receive(:most_recent_summary).and_return(nil)
      allow(topic).to receive(:article_analytics_exist?).and_return(false)
      expect(topic.data_generation_state).to eq(:idle)
    end

    it 'is :complete once both summaries and analytics exist' do
      summary = instance_double(TopicSummary, present?: true)
      allow(topic).to receive(:most_recent_summary).and_return(summary)
      allow(topic).to receive(:article_analytics_exist?).and_return(true)
      expect(topic.data_generation_state).to eq(:complete)
    end
  end

  describe '#chain_to_analytics_if_ready' do
    let(:topic) { create(:topic) }
    let(:bag) { ArticleBag.create!(topic:, name: 'Test bag') }

    before do
      article = Article.create!(title: 'A', wiki: topic.wiki, pageid: 1)
      ArticleBagArticle.create!(article_bag: bag, article:)
    end

    it 'queues analytics when no other phase is in flight' do
      expect(GenerateArticleAnalyticsJob).to receive(:perform_async).and_return('xyz')
      topic.chain_to_analytics_if_ready
      expect(topic.reload.generate_article_analytics_job_id).to eq('xyz')
    end

    it 'no-ops when articles import is still in flight' do
      topic.update(article_import_job_id: 'still-going')
      expect(GenerateArticleAnalyticsJob).not_to receive(:perform_async)
      topic.chain_to_analytics_if_ready
    end

    it 'no-ops when users import is still in flight' do
      topic.update(users_import_job_id: 'still-going')
      expect(GenerateArticleAnalyticsJob).not_to receive(:perform_async)
      topic.chain_to_analytics_if_ready
    end

    it 'no-ops when articles_count is zero (no bag yet)' do
      empty_topic = create(:topic)
      expect(GenerateArticleAnalyticsJob).not_to receive(:perform_async)
      empty_topic.chain_to_analytics_if_ready
    end
  end

  describe '#chain_after_user_import' do
    let(:topic) { create(:topic) }

    it 'recomputes attribution when the topic is already built' do
      allow(topic).to receive(:data_generation_state).and_return(:complete)
      expect(topic).to receive(:queue_attribution_rebuild)
      expect(topic).not_to receive(:chain_to_analytics_if_ready)
      topic.chain_after_user_import
    end

    it 'falls back to the analytics chain during the initial build' do
      allow(topic).to receive(:data_generation_state).and_return(:running)
      expect(topic).to receive(:chain_to_analytics_if_ready)
      expect(topic).not_to receive(:queue_attribution_rebuild)
      topic.chain_after_user_import
    end

    it 'falls back to the analytics chain when the topic is idle' do
      allow(topic).to receive(:data_generation_state).and_return(:idle)
      expect(topic).to receive(:chain_to_analytics_if_ready)
      topic.chain_after_user_import
    end
  end

  describe '#start_data_generation!' do
    let(:topic) { create(:topic) }

    it 'queues analytics when articles already exist' do
      bag = ArticleBag.create!(topic:, name: 'Test bag')
      article = Article.create!(title: 'A', wiki: topic.wiki, pageid: 1)
      ArticleBagArticle.create!(article_bag: bag, article:)
      expect(GenerateArticleAnalyticsJob).to receive(:perform_async).and_return('xyz')
      expect(topic.start_data_generation!).to eq(:queued)
    end

    it 'queues the article CSV import when articles are empty and a CSV is attached' do
      topic.articles_csv.attach(
        io: StringIO.new('Title,Centrality'), filename: 'a.csv', content_type: 'text/csv'
      )
      expect(ImportArticlesJob).to receive(:perform_async).and_return('xyz')
      expect(topic.start_data_generation!).to eq(:queued)
    end

    it 'also queues the users import when a users CSV is attached' do
      topic.articles_csv.attach(
        io: StringIO.new('Title,Centrality'), filename: 'a.csv', content_type: 'text/csv'
      )
      topic.users_csv.attach(
        io: StringIO.new('user1'), filename: 'u.csv', content_type: 'text/csv'
      )
      expect(ImportArticlesJob).to receive(:perform_async).and_return('xyz')
      expect(ImportUsersJob).to receive(:perform_async).and_return('uid')
      expect(topic.start_data_generation!).to eq(:queued)
    end

    it 'is a no-op when a phase is already in flight' do
      topic.update(article_import_job_id: 'in-flight')
      allow(Sidekiq::Status).to receive(:status).with('in-flight').and_return(:working)
      allow(described_class).to receive(:busy_job_ids).and_return(['in-flight'])
      expect(ImportArticlesJob).not_to receive(:perform_async)
      expect(GenerateArticleAnalyticsJob).not_to receive(:perform_async)
      expect(topic.start_data_generation!).to eq(:already_running)
    end

    it 'raises when there are no articles and no CSV' do
      expect {
        topic.start_data_generation!
      }.to raise_error(ImpactVisualizerErrors::TopicNotReadyForDataGeneration)
    end
  end

  describe '#timestamps' do
    let(:topic) { create(:topic, timepoint_day_interval: 7) }

    it 'returns the correct dates within timeframe, with default interval' do
      start_date = Date.new(2023, 1, 1)
      end_date = start_date + 30.days
      topic.update(start_date:, end_date:)
      schedule = topic.timestamps
      expect(schedule.count).to eq(6)
      expect(schedule.first).to eq(Date.new(2023, 1, 1))
      expect(schedule.last).to eq(Date.new(2023, 1, 31))
    end

    it 'returns the correct dates within timeframe, with custom interval' do
      start_date = Date.new(2023, 1, 1)
      end_date = start_date + 30.days
      topic.update(start_date:, end_date:, timepoint_day_interval: 1)
      schedule = topic.timestamps
      expect(schedule.count).to eq(31)
      expect(schedule.first).to eq(Date.new(2023, 1, 1))
      expect(schedule.last).to eq(Date.new(2023, 1, 31))
    end

    it 'raises with missing start_date' do
      topic.update(start_date: nil, end_date: Time.zone.now)
      expect { topic.timestamps }
        .to raise_error(ImpactVisualizerErrors::TopicMissingStartDate)
    end

    it 'raises with missing end_date' do
      topic.update(start_date: Time.zone.now, end_date: nil)
      expect { topic.timestamps }
        .to raise_error(ImpactVisualizerErrors::TopicMissingEndDate)
    end

    it 'raises a clear error when end_date is before start_date' do
      # Assign in memory (timestamps only reads the dates) to reproduce a
      # topic with an invalid range without tripping the model validation.
      topic.start_date = Date.new(2023, 6, 1)
      topic.end_date = Date.new(2023, 1, 1)
      expect { topic.timestamps }
        .to raise_error(ImpactVisualizerErrors::TopicInvalidDateRange)
    end
  end

  describe '#timestamp_previous_to' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { start_date + 30.days }
    let(:topic) { create(:topic, start_date:, end_date:) }

    it 'returns the timestamp previous to the provided timestamp' do
      expect(topic.timestamp_previous_to(Date.new(2023, 1, 8))).to eq(Date.new(2023, 1, 1))
    end

    it 'returns nil if the provided timestamp is the first' do
      expect(topic.timestamp_previous_to(Date.new(2023, 1, 1))).to eq(nil)
    end

    it 'still works if end_date is not midnight' do
      start_date = Date.new(2001, 1, 1)
      end_date = Date.new(2023, 11, 28) + 8.hours
      test_date = Date.new(2023, 11, 28)
      timepoint_day_interval = 365
      topic = create(:topic, start_date:, end_date:, timepoint_day_interval:)
      expect(topic.timestamp_previous_to(test_date)).to eq(Date.new(2022, 12, 27))
    end

    it 'raises if provided timestamp is not valid' do
      expect {
        topic.timestamp_previous_to(Date.new(2022, 1, 2))
      }.to raise_error(ImpactVisualizerErrors::InvalidTimestampForTopic)
    end
  end

  describe '#timestamp_next_to' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { start_date + 30.days }
    let(:topic) { create(:topic, start_date:, end_date:) }

    it 'returns the next timestamp following the provided timestamp' do
      expect(topic.timestamp_next_to(Date.new(2023, 1, 8))).to eq(Date.new(2023, 1, 15))
    end

    it 'returns nil if the provided timestamp is the last' do
      expect(topic.timestamp_next_to(end_date)).to eq(nil)
    end

    it 'raises if provided timestamp is not valid' do
      expect {
        topic.timestamp_next_to(Date.new(2024, 1, 2))
      }.to raise_error(ImpactVisualizerErrors::InvalidTimestampForTopic)
    end
  end

  describe '#first_timestamp' do
    let(:start_date) { Date.new(2023, 1, 1) }
    let(:end_date) { start_date + 30.days }
    let(:topic) { create(:topic, start_date:, end_date:) }

    it 'returns the next timestamp following the provided timestamp' do
      expect(topic.first_timestamp).to eq(Date.new(2023, 1, 1))
    end
  end

  describe '#user_with_wiki_id' do
    let!(:topic) { create(:topic) }
    let!(:user) { create(:user, wiki_user_id: 123) }
    let!(:topic_user) { create(:topic_user, topic:, user:) }

    it 'returns an associated User with the given wiki userid' do
      found_user = topic.user_with_wiki_id(123)
      expect(found_user).to eq(user)
    end

    it 'returns nil if no associated User with the given wiki userid' do
      found_user = topic.user_with_wiki_id(234)
      expect(found_user).to eq(nil)
    end
  end

  describe '#articles_count' do
    include_context 'topic with two timepoints'

    it 'returns count of articles' do
      expect(topic.articles_count).to eq(3)
    end
  end

  describe '#missing_articles_count' do
    include_context 'topic with two timepoints'
    let!(:article_3) { create(:article, pageid: nil, title: 'Nope', missing: true) }
    let!(:article_bag_article_3) { create(:article_bag_article, article: article_3, article_bag:) }

    it 'returns count of articles' do
      expect(topic.articles_count).to eq(3)
      expect(topic.missing_articles_count).to eq(1)
    end
  end

  # The bag-membership filtering on these read methods is the safety
  # net for stale TopicArticleAnalytic rows. The TB sync service
  # already deletes those rows for removed articles, but a bug there
  # (or a different bag-mutating path) shouldn't leak ghost rows
  # into the bubble chart or the "Total Average Daily Visits" stat.
  describe '#article_analytics_data' do
    let(:topic) { create(:topic) }
    let(:bag) { ArticleBag.create!(topic:, name: 'Bag') }
    let(:article_in_bag) { Article.create!(title: 'In', wiki: topic.wiki, pageid: 1) }
    let(:article_removed) { Article.create!(title: 'Out', wiki: topic.wiki, pageid: 2) }

    before do
      ArticleBagArticle.create!(article_bag: bag, article: article_in_bag, centrality: 5)
      TopicArticleAnalytic.create!(topic:, article: article_in_bag, average_daily_views: 100)
      # A TopicArticleAnalytic that survived a bag mutation — article
      # has no ArticleBagArticle in the active bag.
      TopicArticleAnalytic.create!(topic:, article: article_removed, average_daily_views: 999)
    end

    it 'only returns rows for articles in the active bag' do
      data = topic.article_analytics_data
      expect(data.keys).to contain_exactly('In')
      expect(data['Out']).to be_nil
    end

    context 'with classifications' do
      let(:biography) do
        Classification.create!(name: 'biography', prerequisites: [], properties: [],
                               source: Classification::SOURCE_TB_PAYLOAD)
      end
      let(:movement) do
        Classification.create!(name: 'movement', prerequisites: [], properties: [],
                               source: Classification::SOURCE_TB_PAYLOAD)
      end

      before do
        topic.classifications << biography
        topic.classifications << movement
        ArticleClassification.create!(classification: biography, article: article_in_bag,
                                      properties: [])
        ArticleClassification.create!(classification: movement, article: article_in_bag,
                                      properties: [])
      end

      it 'includes the sorted, unique tag names the article belongs to' do
        expect(topic.article_analytics_data['In'][:classifications]).to eq(%w[biography movement])
      end

      it 'returns an empty array for articles with no tags' do
        ArticleClassification.where(article: article_in_bag).destroy_all
        expect(topic.article_analytics_data['In'][:classifications]).to eq([])
      end

      it 'ignores classifications that do not belong to the topic' do
        other = Classification.create!(name: 'unrelated', prerequisites: [], properties: [],
                                       source: Classification::SOURCE_TB_PAYLOAD)
        ArticleClassification.create!(classification: other, article: article_in_bag,
                                      properties: [])
        expect(topic.article_analytics_data['In'][:classifications]).to eq(%w[biography movement])
      end
    end
  end

  describe '#total_average_daily_visits' do
    let(:topic) { create(:topic) }
    let(:bag) { ArticleBag.create!(topic:, name: 'Bag') }
    let(:article_in_bag) { Article.create!(title: 'In', wiki: topic.wiki, pageid: 1) }
    let(:article_removed) { Article.create!(title: 'Out', wiki: topic.wiki, pageid: 2) }

    before do
      ArticleBagArticle.create!(article_bag: bag, article: article_in_bag)
      TopicArticleAnalytic.create!(topic:, article: article_in_bag, average_daily_views: 100)
      TopicArticleAnalytic.create!(topic:, article: article_removed, average_daily_views: 999)
    end

    it 'sums only views for articles still in the active bag' do
      expect(topic.total_average_daily_visits).to eq(100)
    end

    it 'returns 0 when the topic has no active bag' do
      topic.article_bags.destroy_all
      expect(topic.total_average_daily_visits).to eq(0)
    end
  end

  describe '#tokens_per_word_effective' do
    let(:wiki) { create(:wiki, language: 'en', project: 'wikipedia') }
    let(:topic) { create(:topic, wiki:) }

    it 'returns the per-topic override when set and positive' do
      topic.update(tokens_per_word: 4.2)
      expect(topic.tokens_per_word_effective).to eq(4.2)
    end

    it 'falls back to the wiki language default when override is nil' do
      topic.update(tokens_per_word: nil)
      expect(topic.tokens_per_word_effective).to eq(wiki.tokens_per_word_default)
    end

    it 'falls back to the wiki language default when override is zero' do
      topic.update_column(:tokens_per_word, 0.0)
      expect(topic.tokens_per_word_effective).to eq(wiki.tokens_per_word_default)
    end
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                                :bigint           not null, primary key
#  chart_time_unit                   :string           default("year")
#  convert_tokens_to_words           :boolean          default(TRUE)
#  description                       :string
#  display                           :boolean          default(FALSE)
#  editor_label                      :string           default("participant")
#  end_date                          :datetime
#  name                              :string
#  slug                              :string
#  start_date                        :datetime
#  tb_handle                         :string
#  timepoint_day_interval            :integer          default(7)
#  tokens_per_word                   :float
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  article_import_job_id             :string
#  generate_article_analytics_job_id :string
#  incremental_topic_build_job_id    :string
#  tb_source_topic_id                :integer
#  timepoint_generate_job_id         :string
#  users_import_job_id               :string
#  wiki_id                           :integer
#
# Indexes
#
#  index_topics_on_tb_source_topic_id  (tb_source_topic_id) WHERE (tb_source_topic_id IS NOT NULL)
#
