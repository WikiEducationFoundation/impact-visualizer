# frozen_string_literal: true

class GenerateArticleAnalyticsJob
  include Sidekiq::Job
  include Sidekiq::Status::Worker
  sidekiq_options queue: 'article_analytics'

  # Empirically tuned: 5 threads × ~16 calls/article saturates
  # Wikipedia's per-IP bucket within seconds — a 6562-article test run
  # generated 44 `429 Too Many Requests` events in the first 3
  # minutes, with throughput throttled to ~17 articles/min. 3 threads
  # holds steady-state below the bucket-refill rate so the retry
  # handler is the exception, not the rule. Per-request retry with
  # Retry-After + 0–3 s jitter still catches the occasional burst.
  THREADS_COUNT = 3

  def perform(topic_id)
    @expiration = 60 * 60 * 24 * 7

    topic = Topic.find topic_id
    wiki = topic.wiki
    return unless wiki

    articles = topic.active_article_bag.articles
    if articles.empty?
      topic.reload.update(generate_article_analytics_job_id: nil)
      chain_incremental_topic_build!(topic)
      return
    end

    total(articles.count)
    at(0, 'Starting article analytics generation')
    store(skipped: 0)

    start_date = topic.start_date || Date.current.beginning_of_year
    end_date = topic.end_date || Date.current.end_of_year

    prev_end_date = end_date.prev_year
    prev_start_date = start_date.prev_year

    article_stats_service = ArticleStatsService.new(wiki)
    progress_mutex = Mutex.new
    skipped_mutex = Mutex.new
    done = 0
    skipped_count = 0

    Parallel.each(articles, in_threads: THREADS_COUNT) do |article|
      ActiveRecord::Base.connection_pool.with_connection do
        # skip if the page doesn't exist
        article_stats_service.update_details_for_article(article:)
        if article.reload.missing
          Rails.logger.info("[GenerateArticleAnalyticsJob] Article not found: #{article.title}")
          skipped_mutex.synchronize { skipped_count += 1; store(skipped: skipped_count) }
          progress_mutex.synchronize { done += 1; at(done, "Not found: #{article.title}") }
          next
        end

        average_views = article_stats_service.get_average_daily_views(
          article: article.title,
          start_year: start_date.year,
          end_year: end_date.year,
          start_month: start_date.month,
          start_day: start_date.day,
          end_month: end_date.month,
          end_day: end_date.day
        )

        prev_average_views = article_stats_service.get_average_daily_views(
          article: article.title,
          start_year: prev_start_date.year,
          end_year: prev_end_date.year,
          start_month: prev_start_date.month,
          start_day: prev_start_date.day,
          end_month: prev_end_date.month,
          end_day: prev_end_date.day
        )

        topic_article_analytic = TopicArticleAnalytic.find_or_initialize_by(
          topic:,
          article:
        )

        topic_article_analytic.update!(
          average_daily_views: average_views.round,
          prev_average_daily_views: prev_average_views&.round,
          publication_date: article.first_revision_at&.to_date,
          linguistic_versions_count: fetch_linguistic_versions_count(article_stats_service:,
                                                                     article:),
          images_count: fetch_images_count(article_stats_service:, article:),
          warning_tags_count: fetch_warning_tags_count(article_stats_service:, article:),
          number_of_editors: fetch_number_of_editors(article_stats_service:, article:),
          article_size: fetch_article_size(article_stats_service:, article:, date: end_date),
          prev_article_size: fetch_article_size(article_stats_service:, article:,
                                                date: prev_end_date),
          talk_size: fetch_talk_size(article_stats_service:, article:, date: end_date),
          prev_talk_size: fetch_talk_size(article_stats_service:, article:, date: prev_end_date),
          lead_section_size: fetch_lead_section_size(article_stats_service:, article:,
                                                     date: end_date),
          assessment_grade: fetch_assessment_grade(article_stats_service:, article:),
          article_protections: fetch_article_protections(article_stats_service:, article:),
          incoming_links_count: fetch_incoming_links_count(article_stats_service:, article:)
        )

        Rails.logger.info("[GenerateArticleAnalyticsJob] Saved analytics for #{article.title} - average_views: #{average_views.round}, prev_average_views: #{prev_average_views&.round}, article_size: #{topic_article_analytic.article_size}, prev_article_size: #{topic_article_analytic.prev_article_size}, talk_size: #{topic_article_analytic.talk_size}, prev_talk_size: #{topic_article_analytic.prev_talk_size}, lead_section_size: #{topic_article_analytic.lead_section_size}")

        progress_mutex.synchronize { done += 1; at(done, "Processed #{article.title}") }
      end
    end

    topic.reload.update(generate_article_analytics_job_id: nil)
    chain_incremental_topic_build!(topic)
  end

  def expiration
    @expiration = 60 * 60 * 24 * 7
  end

  private

  # The TB handoff is a one-click flow: ingest → analytics → timepoint
  # build, all auto-chained. For CSV-driven topics the user still
  # drives each step manually from the topic-detail page, so don't
  # auto-chain there.
  def chain_incremental_topic_build!(topic)
    return unless topic.tb_handle.present?
    return if topic.incremental_topic_build_job_id.present?

    topic.queue_incremental_topic_build(queue_next_stage: true, force_updates: false)
  end

  def fetch_article_size(article_stats_service:, article:, date:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching article size for #{article.title} at #{date}")
    article_stats_service.get_article_size_at_date(article:, date:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching size for #{article.title}: #{e.message}")
    nil
  end

  def fetch_talk_size(article_stats_service:, article:, date:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching talk size for #{article.title} at #{date}")
    article_stats_service.get_talk_page_size_at_date(article:, date:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching talk size for #{article.title}: #{e.message}")
    nil
  end

  def fetch_lead_section_size(article_stats_service:, article:, date:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching lead section size for #{article.title} at #{date}")
    article_stats_service.get_lead_section_size_at_date(article:, date:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching lead section size for #{article.title}: #{e.message}")
    nil
  end

  def fetch_assessment_grade(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching assessment grade for #{article.title}")
    article_stats_service.get_page_assessment_grade(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching assessment for #{article.title}: #{e.message}")
    nil
  end

  def fetch_linguistic_versions_count(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching linguistic versions count for #{article.title}")
    article_stats_service.get_linguistic_versions_count(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching linguistic versions count for #{article.title}: #{e.message}")
    0
  end

  def fetch_images_count(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching images count for #{article.title}")
    article_stats_service.get_images_count(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching images count for #{article.title}: #{e.message}")
    0
  end

  def fetch_warning_tags_count(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching warning tags count for #{article.title}")
    article_stats_service.get_warning_tags_count(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching warning tags count for #{article.title}: #{e.message}")
    0
  end

  def fetch_number_of_editors(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching number of editors for #{article.title}")
    article_stats_service.get_number_of_editors(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching number of editors for #{article.title}: #{e.message}")
    0
  end

  def fetch_article_protections(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching article protections for #{article.title}")
    article_stats_service.get_article_protections(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching article protections for #{article.title}: #{e.message}")
    []
  end

  def fetch_incoming_links_count(article_stats_service:, article:)
    Rails.logger.info("[GenerateArticleAnalyticsJob] Fetching incoming links count for #{article.title}")
    article_stats_service.get_incoming_links_count(article:)
  rescue StandardError => e
    Rails.logger.error("[GenerateArticleAnalyticsJob] Error fetching incoming links count for #{article.title}: #{e.message}")
    0
  end
end
