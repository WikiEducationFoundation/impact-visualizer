# frozen_string_literal: true
require 'benchmark'

class TimepointService
  attr_accessor :topic, :logging_enabled

  def initialize(topic:)
    @topic = topic
    @article_stats_service = ArticleStatsService.new
    @topic_timepoint_stats_service = TopicTimepointStatsService.new
    @topic_article_timepoint_stats_service = nil
    @logging_enabled = !Rails.env.test?
  end

  def build_timepoints
    start_time = Time.zone.now
    # Loop through Topic's timestamps
    timestamps = @topic.timestamps
    timestamp_count = 0
    timestamps.each do |timestamp|
      build_timepoints_for_timestamp(timestamp:)
      log "#build_timepoints_for_timestamp timestamp:#{timestamp_count}/#{timestamps.count}"
    end
    log "#build_timepoints – Started at #{start_time}. Finished at #{Time.zone.now}"
  end

  def build_timepoints_for_timestamp(timestamp:)
    topic = @topic # for hash shorthands

    # Find or create TopicTimepoint for each timestamp
    topic_timepoint = TopicTimepoint.find_or_create_by!(topic:, timestamp:)

    article_bag_articles = @topic.active_article_bag.article_bag_articles
    article_count = 0

    # Loop through all Articles
    article_bag_articles.in_batches(of: 500) do |batch|
      Parallel.each(batch, in_threads: 25) do |article_bag_article|
        ActiveRecord::Base.connection_pool.with_connection do
          article_count += 1
          log "  #build_timepoints_for_article article:#{article_count}/#{article_bag_articles.count}"
          build_timepoints_for_article(article_bag_article:, topic_timepoint:)
          ActiveRecord::Base.connection_pool.release_connection
        end
      end
    end

    # Update TopicTimepoint with summarized stats
    @topic_timepoint_stats_service.update_stats_for_topic_timepoint(topic_timepoint:)
  end

  def build_timepoints_for_article(article_bag_article:, topic_timepoint:)
    timestamp = topic_timepoint.timestamp
    article = article_bag_article.article

    # Update basic details of Article
    @article_stats_service.update_details_for_article(article:)

    # If Article was created after timestamp, skip it
    return unless article.exists_at_timestamp?(timestamp)

    # Find or create ArticleTimepoint for each Article
    article_timepoint = ArticleTimepoint.find_or_create_for_timestamp(
      timestamp:, article:
    )

    # Update ArticleTimepoint with stats
    @article_stats_service.update_stats_for_article_timepoint(article_timepoint:)

    # Find or create TopicArticleTimepoint for each Article
    topic_article_timepoint = TopicArticleTimepoint.find_or_create_by!(
      article_timepoint:, topic_timepoint:
    )

    @topic_article_timepoint_stats_service = TopicArticleTimepointStatsService.new(
      topic_article_timepoint:
    )
    @topic_article_timepoint_stats_service.update_stats_for_topic_article_timepoint
  end

  def log(message)
    return unless @logging_enabled
    ap message
  end
end
