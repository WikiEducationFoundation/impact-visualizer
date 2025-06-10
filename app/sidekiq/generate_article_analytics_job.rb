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

    article_stats_service = ArticleStatsService.new(wiki)

    articles.each_with_index do |article, index|
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
        average_daily_views: average_views.round
      )

      at(index + 1, "Processed #{article.title}")
    end

    topic.reload.update(generate_article_analytics_job_id: nil)
  end

  def expiration
    @expiration = 60 * 60 * 24 * 7
  end
end
