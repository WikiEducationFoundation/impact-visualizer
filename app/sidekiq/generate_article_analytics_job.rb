# frozen_string_literal: true

class GenerateArticleAnalyticsJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'article_analytics'

  def perform(topic_id)
    @expiration = 60 * 60 * 24 * 7

    topic = Topic.find topic_id
    wiki = topic.wiki
    return unless wiki

    articles = topic.active_article_bag.articles
    return if articles.empty?

    total(articles.count)

    start_date = topic.start_date || Date.current.beginning_of_year
    end_date = topic.end_date || Date.current.end_of_year

    prev_end_date = end_date.prev_year

    article_stats_service = ArticleStatsService.new(wiki)

    articles.each_with_index do |article, index|
      Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching average daily views for #{article.title} between #{start_date} and #{end_date}")

      average_views = article_stats_service.get_average_daily_views(
        article: article.title,
        start_year: start_date.year,
        end_year: end_date.year,
        start_month: start_date.month,
        start_day: start_date.day,
        end_month: end_date.month,
        end_day: end_date.day
      )

      topic_article_analytic = TopicArticleAnalytic.find_or_initialize_by(
        topic:,
        article:
      )

      topic_article_analytic.update!(
        average_daily_views: average_views.round,
        article_size: fetch_article_size(article_stats_service:, article:, date: end_date),
        prev_article_size: fetch_article_size(article_stats_service:, article:, date: prev_end_date)
      )

      Rails.logger.info("[GenerateArticleAnalyticsJob] Saved analytics for #{article.title} - average_views: #{average_views.round}, article_size: #{topic_article_analytic.article_size}, prev_article_size: #{topic_article_analytic.prev_article_size}")

      at(index + 1, "Processed #{article.title}")
    end

    topic.reload.update(generate_article_analytics_job_id: nil)
  end

  def expiration
    @expiration = 60 * 60 * 24 * 7
  end

  private

  def fetch_article_size(article_stats_service:, article:, date:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching article size for #{article.title} at #{date}")
    article_stats_service.get_article_size_at_date(article:, date:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching size for #{article.title}: #{e.message}")
    nil
  end
end
