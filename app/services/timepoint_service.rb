# frozen_string_literal: true

class TimepointService
  attr_accessor :topic

  def initialize(topic:)
    @topic = topic
    @article_stats_service = ArticleStatsService.new
    @topic_timepoint_stats_service = TopicTimepointStatsService.new
    @topic_article_timepoint_stats_service = nil
  end

  def build_timepoints
    # Loop through Topic's timestamps
    @topic.timestamps.each do |timestamp|
      build_timepoints_for_timestamp(timestamp:)
    end
  end

  def build_timepoints_for_timestamp(timestamp:)
    topic = @topic # for hash shorthands

    # Find or create TopicTimepoint for each timestamp
    topic_timepoint = TopicTimepoint.find_or_create_by!(topic:, timestamp:)

    # Loop through all Articles
    @topic.active_article_bag.article_bag_articles.each do |article_bag_article|
      build_timepoints_for_article(article_bag_article:, topic_timepoint:)
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
end
