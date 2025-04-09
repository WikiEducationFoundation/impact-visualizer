# frozen_string_literal: true
require 'benchmark'

class TimepointService
  THREADS_COUNT = 10
  BATCH_SIZE = 200
  STAGES = %i[classify article_timepoints tokens topic_timepoints]

  attr_accessor :topic, :logging_enabled, :force_updates

  def initialize(topic:, force_updates: false, logging_enabled: false, total: nil, at: nil)
    @topic = topic
    @article_stats_service = ArticleStatsService.new(@topic.wiki)
    @topic_timepoint_stats_service = TopicTimepointStatsService.new
    @topic_article_timepoint_stats_service = nil
    @force_updates = force_updates
    @logging_enabled = !Rails.env.test? && logging_enabled

    # Capture Sidekiq Status methods
    @progress_count = 0
    @at = at
    @total = total

    log('TimepointService: initialize')
  end

  def incremental_build(stage = STAGES.first, queue_next_stage: false)
    raise ArgumentError, "Invalid stage: #{stage}" unless STAGES.include?(stage)

    initialize_progress_count(stage:)

    case stage
    when :classify
      classify_all_articles
    when :article_timepoints
      build_timepoints_for_all_timestamps
    when :tokens
      update_token_stats
    when :topic_timepoints
      build_topic_timepoints
    end

    next_stage = STAGES[STAGES.index(stage) + 1]
    if queue_next_stage && next_stage
      IncrementalTopicBuildJob.perform_async(
        @topic.id,
        next_stage.to_s,
        true,
        @force_updates
      )
    else
      TopicSummaryService.new(topic:).create_summary
    end
  end

  # Build everything related to Timepoints for Topic
  # Is called by GenerateTimepointsJob
  def full_timepoint_build
    start_time = Time.zone.now
    log "TimepointService: full_timepoint_build – Started at #{start_time}"

    # Setup total count for Sidekiq Status
    @progress_count = 0
    initialize_progress_count

    # Classify all articles
    log '#classify_all_articles'
    classify_all_articles

    # Loop through Topic's timestamps
    # Build/update most everything for each timestamp
    log '#build_timepoints_for_all_timestamps'
    build_timepoints_for_all_timestamps

    # Handle tokens separately, because...
    # WikiWho API only needs 1 API call per article
    #(as opposed to per timepoint AND article)
    log '#update_token_stats'
    update_token_stats

    # Update TopicTimepoints with summarized stats
    # This needs to happen AFTER token stats update
    log '#build_topic_timepoints'
    build_topic_timepoints

    log "#build_timepoints – Started at #{start_time}. Finished at #{Time.zone.now}"
  end

  def classify_all_articles
    ClassificationService.new(topic: @topic).classify_all_articles do
      increment_progress_count
    end
  end

  def build_timepoints_for_all_timestamps
    # Loop through Topic's timestamps
    timestamps = @topic.timestamps
    timestamp_count = 0

    # Build/update most everything for each timestamp
    timestamps.each do |timestamp|
      timestamp_count += 1
      # increment_progress_count
      log "#build_timepoints_for_timestamp timestamp:#{timestamp_count}/#{timestamps.count}"
      build_timepoints_for_timestamp(timestamp:)
    end
  end

  def build_topic_timepoints
    timestamps = @topic.timestamps
    timestamp_count = 0
    timestamps.each do |timestamp|
      timestamp_count += 1
      increment_progress_count
      topic_timepoint = TopicTimepoint.find_or_create_by!(topic:, timestamp:)
      log "#update_stats_for_topic_timepoint timestamp:#{timestamp_count}/#{timestamps.count}"
      @topic_timepoint_stats_service.update_stats_for_topic_timepoint(topic_timepoint:)
    end
  end

  def build_timepoints_for_timestamp(timestamp:)
    topic = @topic # for hash shorthands

    # Find or create TopicTimepoint for each timestamp
    topic_timepoint = TopicTimepoint.find_or_create_by!(topic:, timestamp:)

    article_bag_articles = @topic.active_article_bag.article_bag_articles
    article_count = 0

    # Loop through all Articles
    article_bag_articles.in_batches(of: BATCH_SIZE) do |batch|
      Parallel.each(batch, in_threads: THREADS_COUNT) do |article_bag_article|
        ActiveRecord::Base.connection_pool.with_connection do
          article_count += 1
          increment_progress_count
          log "  #build_timepoints_for_article timestamp:#{timestamp} topic_timepoint_id:#{topic_timepoint.id} article_id:#{article_bag_article.article_id} article:#{article_count}/#{article_bag_articles.count}"
          build_timepoints_for_article(article_bag_article:, topic_timepoint:)
          ActiveRecord::Base.connection_pool.release_connection
        end
      end
    end
  end

  def build_timepoints_for_article(article_bag_article:, topic_timepoint:)
    timestamp = topic_timepoint.timestamp
    article = article_bag_article.article

    # Update basic details of Article
    if !article.details? || @force_updates
      @article_stats_service.update_details_for_article(article:)
    end

    # If Article was created after timestamp, skip it
    return unless article.exists_at_timestamp?(timestamp)

    # Capture if ArticleTimepoint found or created
    new_article_timepoint = false

    # Find or create ArticleTimepoint for each Article
    article_timepoint = ArticleTimepoint.find_or_create_for_timestamp(
      timestamp:, article:
    ) { new_article_timepoint = true }

    # Update ArticleTimepoint with stats, but only if new or force_updates
    if new_article_timepoint || @force_updates
      @article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
    end

    # Capture if TopicArticleTimepoint found or created
    new_topic_article_timepoint = false

    # Find or create TopicArticleTimepoint for each Article
    topic_article_timepoint = TopicArticleTimepoint.find_or_create_by!(
      article_timepoint:, topic_timepoint:
    ) { new_topic_article_timepoint = true }

    if new_topic_article_timepoint || @force_updates
      @topic_article_timepoint_stats_service = TopicArticleTimepointStatsService.new(
        topic_article_timepoint:
      )
      @topic_article_timepoint_stats_service.update_stats_for_topic_article_timepoint
    end
  end

  def update_token_stats
    article_bag_articles = @topic.active_article_bag.article_bag_articles

    article_count = 0

    # Loop through all Articles
    # article_bag_articles.each do |article_bag_article|

    Parallel.each(article_bag_articles, in_threads: THREADS_COUNT) do |article_bag_article|
      ActiveRecord::Base.connection_pool.with_connection do
        article = article_bag_article.article
        article_count += 1
        increment_progress_count
        log "  #update_token_stats_for_article article:#{article_count}/#{article_bag_articles.count} article_id: #{article.id}"

        # Update stats for all timestamps for article
        update_token_stats_for_article(article:)

        ActiveRecord::Base.connection_pool.release_connection
      end
    end
  end

  def update_token_stats_for_article(article:)
    # Get the latest ArticeTimepoint and grab the revision_id
    lastest_topic_article_timepoint = TopicArticleTimepoint.find_latest_for_article_and_topic(
      topic: @topic, article:
    )

    latest_revision_id = lastest_topic_article_timepoint&.article_timepoint&.revision_id

    # Bail if no revision_id
    return unless latest_revision_id

    # Fetch all tokens for the most recent revision of article
    tokens = WikiWhoApi.new(wiki: @topic.wiki).get_revision_tokens(latest_revision_id)

    @topic.timestamps.each do |timestamp|
      # For each timestamp, update the article's token stats
      update_token_stats_for_article_timestamp(article:, timestamp:, tokens:)
    end
  end

  def update_token_stats_for_article_timestamp(article:, timestamp:, tokens:)
    # If Article was created after timestamp, skip it
    return unless article.exists_at_timestamp?(timestamp)

    # Find the ArticleTimepoint
    article_timepoint = ArticleTimepoint.find_or_create_for_timestamp(timestamp:, article:)

    # Find the TopicTimepoint
    topic_timepoint = TopicTimepoint.find_or_create_by!(topic: @topic, timestamp:)

    # Find each TopicArticleTimepoint for each Article
    topic_article_timepoint = TopicArticleTimepoint.find_by(article_timepoint:, topic_timepoint:)

    return unless topic_article_timepoint

    # Pass off to ArticleStatsService to update the stats
    @article_stats_service.update_token_stats(article_timepoint:, tokens:)

    @topic_article_timepoint_stats_service = TopicArticleTimepointStatsService.new(
      topic_article_timepoint:
    )

    # Pass off to TopicArticleTimepointStatsService to update the stats
    @topic_article_timepoint_stats_service.update_token_stats(tokens:)
  end

  def initialize_progress_count(stage: nil)
    timestamp_count = @topic.timestamps.count
    article_count = @topic.active_article_bag&.article_bag_articles&.count

    return 0 unless timestamp_count && article_count

    total_progress_steps = 0

    if stage.nil? || stage == :classify
      # Add Article count for classify_all_articles loop
      total_progress_steps += article_count
    end

    if stage.nil? || stage == :article_timepoints
      # Add count with timestamp count, for build_timepoints_for_timestamp loop
      total_progress_steps += (timestamp_count * article_count)
    end

    if stage.nil? || stage == :tokens
      # Add Article count for update_token_stats loop
      total_progress_steps += article_count
    end

    if stage.nil? || stage == :topic_timepoints
      # Add timestamp count again, for build_topic_timepoints loop
      total_progress_steps += timestamp_count
    end

    # Lock in the total count
    @total&.call(total_progress_steps)
  end

  def increment_progress_count
    @progress_count += 1
    @at&.call(@progress_count)
  end

  def log(message)
    return unless @logging_enabled
    ap message
  end
end
