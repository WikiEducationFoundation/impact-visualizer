# frozen_string_literal: true

require 'sidekiq/api' # Sidekiq::Workers, for job-liveness checks

class Topic < ApplicationRecord
  ## Mixins
  include Rails.application.routes.url_helpers
  has_one_attached :users_csv
  has_one_attached :articles_csv

  ## Associations
  belongs_to :wiki
  has_many :article_bags, -> { order(created_at: :desc) }, dependent: :destroy
  has_many :articles, through: :article_bags
  has_many :topic_users, dependent: :delete_all
  has_many :users, through: :topic_users
  has_many :topic_timepoints, dependent: :destroy
  has_many :topic_article_analytics, dependent: :delete_all
  has_many :topic_summaries, dependent: :delete_all
  has_many :topic_editor_topics, dependent: :delete_all
  has_many :topic_editors, through: :topic_editor_topics
  has_many :topic_classifications
  has_many :classifications, through: :topic_classifications

  ## Validations
  validate :end_date_not_before_start_date

  ## Instance methods

  # The tokens_per_word divisor that should actually be used to convert
  # WikiWho token counts into reader-facing words. Returns the per-topic
  # override when set, falling back to the wiki's empirically-derived
  # per-language default. See docs/words-per-token-methodology.md.
  def tokens_per_word_effective
    return tokens_per_word if tokens_per_word.present? && tokens_per_word.positive?
    wiki&.tokens_per_word_default || Wiki::TOKENS_PER_WORD_GLOBAL_FALLBACK
  end

  def timestamps
    raise ImpactVisualizerErrors::TopicMissingStartDate unless start_date
    raise ImpactVisualizerErrors::TopicMissingEndDate unless end_date

    clean_start_date = start_date.beginning_of_day
    clean_end_date = end_date.beginning_of_day

    # A backwards range yields zero timepoints, which would leave the loop
    # below empty and blow up on `output.last < clean_end_date`. Fail with a
    # clear domain error instead of a NoMethodError on nil.
    raise ImpactVisualizerErrors::TopicInvalidDateRange if clean_end_date < clean_start_date

    # Get total number of days within range... converted from seconds to days, with a 1 day buffer
    total_days = ((clean_end_date - clean_start_date) / 1.day.to_i) + 1

    # Calculate how many timestamps fit within range
    total_timepoints = (total_days / timepoint_day_interval).ceil

    # Initialize variables for loop
    output = []
    next_date = clean_start_date

    # Build array of dates
    total_timepoints.times do
      output << next_date
      next_date += timepoint_day_interval.days
    end

    # Make sure the end_date gets in there
    output << clean_end_date if output.last < clean_end_date

    # Return final array of dates
    output
  end

  def first_timestamp
    timestamps.first
  end

  def last_timestamp
    timestamps.last
  end

  def timestamp_previous_to(timestamp)
    timestamp_index = timestamps.index(timestamp)

    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.nil?
    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.negative?

    return nil unless timestamp_index.positive?
    timestamps[timestamp_index - 1]
  end

  def timestamp_next_to(timestamp)
    timestamp_index = timestamps.index(timestamp)

    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.nil?
    raise ImpactVisualizerErrors::InvalidTimestampForTopic if timestamp_index.negative?

    return nil unless timestamp_index.positive?
    timestamps[timestamp_index + 1]
  end

  def user_with_wiki_id(wiki_user_id)
    users.find_by(wiki_user_id:)
  end

  def timepoints_count
    topic_timepoints.count || 0
  end

  def summaries_count
    topic_summaries.count || 0
  end

  def user_count
    users.count || 0
  end

  def users_csv_filename
    return nil unless users_csv.attached?
    users_csv&.filename&.to_s
  end

  def articles_csv_filename
    return nil unless articles_csv.attached?
    articles_csv&.filename&.to_s
  end

  def users_csv_url
    return nil unless users_csv.attached?
    rails_blob_path(users_csv, disposition: 'attachment', only_path: true)
  end

  def articles_csv_url
    return nil unless articles_csv.attached?
    rails_blob_path(articles_csv, disposition: 'attachment', only_path: true)
  end

  def active_article_bag
    article_bags.last
  end

  def articles_count
    active_article_bag&.articles&.count || 0
  end

  def missing_articles_count
    active_article_bag&.articles&.missing&.count || 0
  end

  def total_average_daily_visits
    bag = active_article_bag
    return 0 unless bag
    # Restrict to articles still present in the active bag — without
    # this, removed articles' analytics keep contributing to the total
    # until incremental_topic_build runs and re-summarizes.
    topic_article_analytics
      .where(article_id: bag.article_bag_articles.select(:article_id))
      .sum(:average_daily_views)
  end

  def most_recent_summary
    topic_summaries.last
  end

  def article_analytics_data
    # INNER JOIN restricts the result to articles currently in the
    # active bag. A LEFT JOIN here would leak rows for articles that
    # were removed from the bag (e.g. by a TB sync) but whose
    # TopicArticleAnalytic rows haven't been cleaned up yet, so the
    # bubble chart would render points for articles no longer in the
    # topic. The sync service does delete those rows today; this is
    # the defensive companion to that cleanup.
    centrality_join = ActiveRecord::Base.sanitize_sql_array(
      [
        'INNER JOIN article_bag_articles ON article_bag_articles.article_id = topic_article_analytics.article_id AND article_bag_articles.article_bag_id = ?',
        active_article_bag&.id
      ]
    )

    # Per-article tag (Classification) names for this topic, keyed by title.
    # Fetched separately rather than joined into the pluck above, which would
    # duplicate analytics rows for articles carrying more than one tag.
    names_by_title = article_classification_names_by_title

    topic_article_analytics
      .joins(:article)
      .joins(centrality_join)
      .pluck('articles.title', :average_daily_views, :prev_average_daily_views, :article_size, :prev_article_size, :talk_size, :prev_talk_size, :lead_section_size, :assessment_grade, :publication_date, :linguistic_versions_count, :warning_tags_count, :images_count, :number_of_editors, :article_protections, :incoming_links_count, 'article_bag_articles.centrality')
      .to_h do |title, average_daily_views, prev_average_daily_views, article_size, prev_article_size, talk_size, prev_talk_size, lead_section_size, assessment_grade, publication_date, linguistic_versions_count, warning_tags_count, images_count, number_of_editors, article_protections, incoming_links_count, centrality|
        [title,
         { average_daily_views:, prev_average_daily_views:, article_size:, prev_article_size:, talk_size:, prev_talk_size:,
          lead_section_size:, assessment_grade:, publication_date:, linguistic_versions_count:, warning_tags_count:,
          images_count:, number_of_editors:, article_protections:, incoming_links_count:, centrality:,
          classifications: names_by_title[title] || [] }]
      end
  end

  # Maps article title => sorted, unique list of this topic's Classification
  # names the article belongs to. Scoped to the active bag so it lines up with
  # the articles in article_analytics_data.
  def article_classification_names_by_title
    names_by_title = ArticleClassification
      .joins(:article, :classification)
      .where(classification_id: classification_ids,
             articles: { id: active_article_bag&.article_ids })
      .pluck('articles.title', 'classifications.name')
      .each_with_object(Hash.new { |hash, key| hash[key] = [] }) do |(title, name), acc|
        acc[title] << name
      end
    names_by_title.transform_values { |names| names.uniq.sort }
  end

  def article_analytics_exist?
    topic_article_analytics.with_pageviews.exists? && topic_article_analytics.with_size.exists?
  end

  def data_updated_at
    topic_article_analytics.maximum(:updated_at)
  end

  # Remove a single article (by title) from the active bag, hard-deleting its
  # topic-scoped analytics + timepoints. Mirrors the batch cleanup in
  # TopicBuilderSyncService#apply_removes!. The Article + ArticleTimepoint rows
  # are article-scoped (possibly shared with other topics) and are left intact.
  # Returns true if an article was removed, false if the title isn't in the bag.
  def remove_article_from_active_bag!(title:)
    bag = active_article_bag
    return false unless bag

    article_bag_article = bag.article_bag_articles.joins(:article).find_by(articles: { title: })
    return false unless article_bag_article

    article_id = article_bag_article.article_id

    transaction do
      TopicArticleTimepoint
        .joins(:topic_timepoint, :article_timepoint)
        .where(topic_timepoints: { topic_id: id },
               article_timepoints: { article_id: })
        .delete_all

      TopicArticleAnalytic.where(topic_id: id, article_id:).delete_all

      ArticleBagArticle.where(id: article_bag_article.id).delete_all
    end

    true
  end

  def add_article_to_active_bag!(title:, pageid: nil)
    bag = active_article_bag
    return nil unless bag

    article = Article.find_or_create_by!(title:, wiki:)
    article.update!(pageid:) if pageid && article.pageid.nil?

    return nil if bag.article_bag_articles.exists?(article_id: article.id)

    bag.article_bag_articles.create!(article:)
    article
  end

  def queue_articles_import
    job_id = ImportArticlesJob.perform_async(id)
    update article_import_job_id: job_id
  end

  def queue_users_import
    job_id = ImportUsersJob.perform_async(id)
    update users_import_job_id: job_id
  end

  def queue_generate_timepoints(force_updates: false)
    job_id = GenerateTimepointsJob.perform_async(id, force_updates)
    update timepoint_generate_job_id: job_id
  end

  def queue_incremental_topic_build(
    stage: TimepointService::STAGES.first,
    queue_next_stage: true,
    force_updates: false,
    attribution_only: false
  )
    job_id = IncrementalTopicBuildJob.perform_async(
      id, stage.to_s, queue_next_stage, force_updates, attribution_only
    )
    update incremental_topic_build_job_id: job_id
  end

  # Recompute only the user-attributed data after the topic's user list
  # changes on an already-built topic. Enters at :article_timepoints
  # (skipping :classify, which doesn't depend on users) in attribution_only
  # mode, so the build re-attributes existing cells without refetching the
  # user-independent article stats, then re-aggregates topic timepoints and
  # the summary. See TimepointService#reattribute_topic_article_timepoint.
  def queue_attribution_rebuild
    queue_incremental_topic_build(
      stage: :article_timepoints,
      queue_next_stage: true,
      attribution_only: true
    )
  end

  def queue_generate_article_analytics
    job_id = GenerateArticleAnalyticsJob.perform_async(id)
    update generate_article_analytics_job_id: job_id
  end

  # Called from ImportArticlesJob and ImportUsersJob when each finishes.
  # The CSV flow queues both imports in parallel; whichever completes
  # second triggers the next phase. The job_id checks here are the
  # gate — analytics only runs once both imports have cleared.
  def chain_to_analytics_if_ready
    return if generate_article_analytics_job_id.present?
    return if article_import_job_id.present?
    return if users_import_job_id.present?
    return unless articles_count.positive?

    queue_generate_article_analytics
  end

  # Called from ImportUsersJob when a user import finishes. On an
  # already-built topic, changing the user list only invalidates the
  # user-attributed data, so we recompute just that (attribution_only)
  # rather than re-running analytics + a full build that would skip every
  # already-built cell and leave attribution stale. During the initial
  # build the topic isn't :complete yet, so we fall back to the normal
  # analytics chain (which gates on the parallel article import).
  def chain_after_user_import
    if data_generation_state == :complete
      queue_attribution_rebuild
    else
      chain_to_analytics_if_ready
    end
  end

  # True when any phase of the pipeline (import / analytics / build) has a
  # job that is still genuinely alive in Sidekiq. Each job clears its own
  # id on completion, but a job killed mid-run (deploy SIGTERM, OOM) can't,
  # leaving a stale *_job_id that must NOT pin the topic in :running — so
  # we verify liveness against Sidekiq rather than trusting the column.
  def data_generation_in_progress?
    [article_import_job_id, users_import_job_id,
     generate_article_analytics_job_id,
     incremental_topic_build_job_id,
     timepoint_generate_job_id].any? { |job_id| self.class.job_alive?(job_id) }
  end

  # Unified state for the topic detail page's progress UI.
  #   :running   — any phase has an active Sidekiq job
  #   :complete  — has both topic summaries and article analytics
  #   :idle      — pristine; show the Start button
  # An :error state is intentionally omitted: a failed Sidekiq job
  # surfaces via its per-phase *_status field, and the user can
  # retry via the overflow menu.
  def data_generation_state
    return :running if data_generation_in_progress?
    return :complete if most_recent_summary.present? && article_analytics_exist?
    :idle
  end

  # Single kickoff for the unified data-generation pipeline. The
  # frontend "Start" button hits this. If articles aren't yet
  # imported, queues the import jobs (which chain into analytics on
  # completion). If articles are present, queues analytics directly
  # (which chains into the timepoint build).
  def start_data_generation!
    return :already_running if data_generation_in_progress?

    if articles_count.zero?
      raise ImpactVisualizerErrors::TopicNotReadyForDataGeneration unless articles_csv.attached?
      queue_articles_import
      queue_users_import if users_csv.attached?
    else
      queue_generate_article_analytics
    end
    :queued
  end

  def incremental_topic_build_stage_message
    return '' unless incremental_topic_build_job_id
    stage = Sidekiq::Status::get(incremental_topic_build_job_id, :stage)
    return '' unless stage
    stage_number = TimepointService::STAGES.index(stage.to_sym) + 1
    total_stages = TimepointService::STAGES.count
    stage_progress = "#{stage_number}/#{total_stages}"
    "Stage #{stage_progress} (#{stage})"
  end

  def users_import_status
    return :idle unless users_import_job_id
    Sidekiq::Status::status(users_import_job_id)
  end

  def articles_import_status
    return :idle unless article_import_job_id
    Sidekiq::Status::status(article_import_job_id)
  end

  def timepoint_generate_status
    return :idle unless timepoint_generate_job_id
    Sidekiq::Status::status(timepoint_generate_job_id)
  end

  def timepoint_generate_message
    return '' unless timepoint_generate_job_id
    Sidekiq::Status::get(timepoint_generate_job_id, :message) || ''
  end

  def incremental_topic_build_status
    return :idle unless incremental_topic_build_job_id
    Sidekiq::Status::status(incremental_topic_build_job_id)
  end

  def incremental_topic_build_message
    return '' unless incremental_topic_build_job_id
    Sidekiq::Status::get(incremental_topic_build_job_id, :message) || ''
  end

  def generate_article_analytics_status
    return :idle unless generate_article_analytics_job_id
    Sidekiq::Status::status(generate_article_analytics_job_id)
  end

  def users_import_percent_complete
    return nil unless users_import_job_id
    Sidekiq::Status::pct_complete(users_import_job_id)
  end

  def articles_import_percent_complete
    return nil unless article_import_job_id
    Sidekiq::Status::pct_complete(article_import_job_id)
  end

  def timepoint_generate_percent_complete
    return nil unless timepoint_generate_job_id
    Sidekiq::Status::pct_complete(timepoint_generate_job_id)
  end

  def incremental_topic_build_percent_complete
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::pct_complete(incremental_topic_build_job_id)
  end

  # Absolute counters for the current stage's progress hash. `at` and
  # `total` are units-per-stage (cells, articles, or timestamps depending
  # on stage); the frontend labels them per current stage. timestamps_*
  # are sub-counters emitted by stages that loop over the topic's
  # timestamps (article_timepoints, topic_timepoints).
  def incremental_topic_build_at
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::at(incremental_topic_build_job_id)
  end

  def incremental_topic_build_total
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::total(incremental_topic_build_job_id)
  end

  def incremental_topic_build_timestamps_done
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::get(incremental_topic_build_job_id, :timestamps_done)&.to_i
  end

  def incremental_topic_build_timestamps_total
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::get(incremental_topic_build_job_id, :timestamps_total)&.to_i
  end

  def generate_article_analytics_percent_complete
    return nil unless generate_article_analytics_job_id
    Sidekiq::Status::pct_complete(generate_article_analytics_job_id)
  end

  def generate_article_analytics_articles_fetched
    return nil unless generate_article_analytics_job_id
    Sidekiq::Status::at(generate_article_analytics_job_id)
  end

  def generate_article_analytics_articles_total
    return nil unless generate_article_analytics_job_id
    Sidekiq::Status::total(generate_article_analytics_job_id)
  end

  def generate_article_analytics_skipped
    return nil unless generate_article_analytics_job_id
    value = Sidekiq::Status::get(generate_article_analytics_job_id, :skipped)
    value&.to_i || 0
  end

  def incremental_topic_build_stage
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::get(incremental_topic_build_job_id, :stage)
  end

  def generate_article_analytics_message
    return '' unless generate_article_analytics_job_id
    Sidekiq::Status::get(generate_article_analytics_job_id, :message) || ''
  end

  # Per-job started_at (Unix epoch seconds). The frontend uses these
  # together with pct_complete to compute a live ETA for the
  # currently-running step.
  def users_import_started_at
    return nil unless users_import_job_id
    Sidekiq::Status::get(users_import_job_id, :started_at)&.to_i
  end

  def articles_import_started_at
    return nil unless article_import_job_id
    Sidekiq::Status::get(article_import_job_id, :started_at)&.to_i
  end

  def generate_article_analytics_started_at
    return nil unless generate_article_analytics_job_id
    Sidekiq::Status::get(generate_article_analytics_job_id, :started_at)&.to_i
  end

  def incremental_topic_build_started_at
    return nil unless incremental_topic_build_job_id
    Sidekiq::Status::get(incremental_topic_build_job_id, :started_at)&.to_i
  end

  def timepoint_generate_started_at
    return nil unless timepoint_generate_job_id
    Sidekiq::Status::get(timepoint_generate_job_id, :started_at)&.to_i
  end

  # For ActiveAdmin
  def self.ransackable_associations(_auth_object = nil)
    %w[article_bags articles topic_summaries topic_timepoints
       topic_classifications classifications topic_users users wiki]
  end

  # For ActiveAdmin
  def self.ransackable_attributes(_auth_object = nil)
    %w[chart_time_unit created_at description display editor_label end_date id name
       slug start_date tb_handle timepoint_day_interval updated_at words_per_token
       convert_tokens_to_words wiki_id]
  end

  # Whether a recorded *_job_id still refers to a live Sidekiq job.
  # :queued / :retrying mean it's waiting in a queue or the retry set.
  # :working is only trustworthy when a worker actually holds the jid — a
  # process killed mid-run (OOM/SIGKILL) leaves the status frozen at
  # :working with no worker, which must count as dead. Everything else
  # (:complete, :failed, :interrupted, or an expired/unknown nil) is done.
  def self.job_alive?(job_id)
    return false if job_id.blank?

    case Sidekiq::Status.status(job_id)
    when :queued, :retrying then true
    when :working then busy_job_ids.include?(job_id)
    else false
    end
  rescue StandardError => e
    # Never let Sidekiq/Redis introspection 500 a topic render. Fail safe
    # by assuming the recorded job is still alive (preserves the running
    # state) rather than crashing or falsely showing a build as idle.
    Rails.logger.warn("Topic.job_alive? Sidekiq check failed: #{e.class}: #{e.message}")
    true
  end

  # jids of jobs currently held by a Sidekiq worker across all processes.
  # WorkSet#each yields Sidekiq::Work objects (Sidekiq 7.3+), whose #job is
  # a JobRecord exposing #jid — don't treat the work item as a Hash.
  def self.busy_job_ids
    Sidekiq::Workers.new.map { |_process, _thread, work| work.job.jid }
  end

  private

  # A topic whose end_date precedes its start_date has an empty timeframe
  # and breaks timepoint generation (see #timestamps). Reject it at save.
  def end_date_not_before_start_date
    return if start_date.blank? || end_date.blank?
    return unless end_date < start_date
    errors.add(:end_date, 'must not be before the start date')
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
