# frozen_string_literal: true

class TimepointService
  attr_accessor :topic

  def initialize(topic:)
    @topic = topic
    @article_stats_service = ArticleStatsService.new
    @topic_timepoint_stats_service = TopicTimepointStatsService.new
  end

  def build_timepoints
    topic = @topic # for hash shorthands

    # Loop through Topic's timestamps
    @topic.timestamps.each do |timestamp|
      # Find or create TopicTimepoint for each timestamp
      topic_timepoint = TopicTimepoint.find_or_create_by!(topic:, timestamp:)

      @topic.active_article_bag.article_bag_articles.each do |article_bag_article|
        article = article_bag_article.article

        # Update basic details of Article
        @article_stats_service.update_details_for_article(article:)

        # Find or create ArticleTimepoint for each Article
        article_timepoint = ArticleTimepoint.find_or_create_by!(
          timestamp:, article:
        )

        # Update article_timepoint with stats
        @article_stats_service.update_stats_for_article_timepoint(article_timepoint:)

        # Find or create TopicArticleTimepoint for each Article
        topic_article_timepoint = TopicArticleTimepoint.find_or_create_by!(
          article_timepoint:, topic_timepoint:
        )

        # Update topic_article_timepoint with stats
        @article_stats_service.update_stats_for_topic_article_timepoint(topic_article_timepoint:)
      end

      # Update TopicTimepoint with summarized stats
      @topic_timepoint_stats_service.update_stats_for_topic_timepoint(topic_timepoint:)
    end
  end
end
