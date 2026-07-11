# frozen_string_literal: true

class ArticleAnalyticsService
  def initialize(topic)
    @topic = topic
    @article_stats_service = ArticleStatsService.new(topic.wiki)
    @start_date = topic.start_date || Date.current.beginning_of_year
    @end_date = topic.end_date || Date.current.end_of_year
    @prev_start_date = @start_date.prev_year
    @prev_end_date = @end_date.prev_year
  end

  def generate_for_article(article)
    @article_stats_service.update_details_for_article(article:)
    return :missing if article.reload.missing

    topic_article_analytic = TopicArticleAnalytic.find_or_initialize_by(
      topic: @topic,
      article:
    )
    topic_article_analytic.update!(analytic_attributes(article))

    log_saved(article, topic_article_analytic)

    :ok
  end

  private

  def analytic_attributes(article)
    Rails.logger.info("[ArticleAnalyticsService] Fetching analytics fields for #{article.title}")
    average_views = average_daily_views_between(article, @start_date, @end_date)
    prev_average_views = average_daily_views_between(article, @prev_start_date, @prev_end_date)

    {
      average_daily_views: average_views.round,
      prev_average_daily_views: prev_average_views&.round,
      publication_date: article.first_revision_at&.to_date,
      linguistic_versions_count: fetch_linguistic_versions_count(article:),
      images_count: fetch_images_count(article:),
      warning_tags_count: fetch_warning_tags_count(article:),
      number_of_editors: fetch_number_of_editors(article:),
      article_size: fetch_article_size(article:, date: @end_date),
      prev_article_size: fetch_article_size(article:, date: @prev_end_date),
      talk_size: fetch_talk_size(article:, date: @end_date),
      prev_talk_size: fetch_talk_size(article:, date: @prev_end_date),
      lead_section_size: fetch_lead_section_size(article:, date: @end_date),
      assessment_grade: fetch_assessment_grade(article:),
      article_protections: fetch_article_protections(article:),
      incoming_links_count: fetch_incoming_links_count(article:)
    }
  end

  def average_daily_views_between(article, from, to)
    @article_stats_service.get_average_daily_views(
      article: article.title,
      start_year: from.year,
      end_year: to.year,
      start_month: from.month,
      start_day: from.day,
      end_month: to.month,
      end_day: to.day
    )
  end

  def log_saved(article, analytic)
    Rails.logger.info(
      "[ArticleAnalyticsService] Saved analytics for #{article.title} - " \
      "average_views: #{analytic.average_daily_views}, " \
      "prev_average_views: #{analytic.prev_average_daily_views}, " \
      "article_size: #{analytic.article_size}, " \
      "prev_article_size: #{analytic.prev_article_size}, " \
      "talk_size: #{analytic.talk_size}, " \
      "prev_talk_size: #{analytic.prev_talk_size}, " \
      "lead_section_size: #{analytic.lead_section_size}"
    )
  end

  def log_fetch_error(what, article, error)
    Rails.logger.error(
      "[ArticleAnalyticsService] Error fetching #{what} for #{article.title}: #{error.message}"
    )
  end

  def fetch_article_size(article:, date:)
    @article_stats_service.get_article_size_at_date(article:, date:)
  rescue StandardError => e
    log_fetch_error('size', article, e)
    nil
  end

  def fetch_talk_size(article:, date:)
    @article_stats_service.get_talk_page_size_at_date(article:, date:)
  rescue StandardError => e
    log_fetch_error('talk size', article, e)
    nil
  end

  def fetch_lead_section_size(article:, date:)
    @article_stats_service.get_lead_section_size_at_date(article:, date:)
  rescue StandardError => e
    log_fetch_error('lead section size', article, e)
    nil
  end

  def fetch_assessment_grade(article:)
    @article_stats_service.get_page_assessment_grade(article:)
  rescue StandardError => e
    log_fetch_error('assessment', article, e)
    nil
  end

  def fetch_linguistic_versions_count(article:)
    @article_stats_service.get_linguistic_versions_count(article:)
  rescue StandardError => e
    log_fetch_error('linguistic versions count', article, e)
    0
  end

  def fetch_images_count(article:)
    @article_stats_service.get_images_count(article:)
  rescue StandardError => e
    log_fetch_error('images count', article, e)
    0
  end

  def fetch_warning_tags_count(article:)
    @article_stats_service.get_warning_tags_count(article:)
  rescue StandardError => e
    log_fetch_error('warning tags count', article, e)
    0
  end

  def fetch_number_of_editors(article:)
    @article_stats_service.get_number_of_editors(article:)
  rescue StandardError => e
    log_fetch_error('number of editors', article, e)
    0
  end

  def fetch_article_protections(article:)
    @article_stats_service.get_article_protections(article:)
  rescue StandardError => e
    log_fetch_error('article protections', article, e)
    []
  end

  def fetch_incoming_links_count(article:)
    @article_stats_service.get_incoming_links_count(article:)
  rescue StandardError => e
    log_fetch_error('incoming links count', article, e)
    0
  end
end
