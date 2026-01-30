# frozen_string_literal: true

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

  ## Instance methods
  def timestamps
    raise ImpactVisualizerErrors::TopicMissingStartDate unless start_date
    raise ImpactVisualizerErrors::TopicMissingEndDate unless end_date

    clean_start_date = start_date.beginning_of_day
    clean_end_date = end_date.beginning_of_day

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
    topic_article_analytics.sum(:average_daily_views)
  end

  def most_recent_summary
    topic_summaries.last
  end

  def article_analytics_data
    topic_article_analytics
      .joins(:article)
      .pluck('articles.title', :average_daily_views, :prev_average_daily_views, :article_size, :prev_article_size, :talk_size, :prev_talk_size, :lead_section_size, :assessment_grade, :publication_date, :linguistic_versions_count, :warning_tags_count, :images_count, :number_of_editors, :article_protections)
      .map do |title, average_daily_views, prev_average_daily_views, article_size, prev_article_size, talk_size, prev_talk_size, lead_section_size, assessment_grade, publication_date, linguistic_versions_count, warning_tags_count, images_count, number_of_editors, article_protections|
        [title,
         { average_daily_views:, prev_average_daily_views:, article_size:, prev_article_size:, talk_size:, prev_talk_size:,
          lead_section_size:, assessment_grade:, publication_date:, linguistic_versions_count:, warning_tags_count:,
          images_count:, number_of_editors:, article_protections: }]
      end
      .to_h
  end

  def article_analytics_exist?
    topic_article_analytics.with_pageviews.exists? && topic_article_analytics.with_size.exists?
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
    force_updates: false
  )
    job_id = IncrementalTopicBuildJob.perform_async(
      id, stage.to_s, queue_next_stage, force_updates
    )
    update incremental_topic_build_job_id: job_id
  end

  def queue_generate_article_analytics
    job_id = GenerateArticleAnalyticsJob.perform_async(id)
    update generate_article_analytics_job_id: job_id
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

  # For ActiveAdmin
  def self.ransackable_associations(_auth_object = nil)
    %w[article_bags articles topic_summaries topic_timepoints
       topic_classifications classifications topic_users users wiki]
  end

  # For ActiveAdmin
  def self.ransackable_attributes(_auth_object = nil)
    %w[chart_time_unit created_at description display editor_label end_date id name
       slug start_date timepoint_day_interval updated_at words_per_token
       convert_tokens_to_words wiki_id]
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                                :bigint           not null, primary key
#  chart_time_unit                   :string           default("year")
#  convert_tokens_to_words           :boolean          default(FALSE)
#  description                       :string
#  display                           :boolean          default(FALSE)
#  editor_label                      :string           default("participant")
#  end_date                          :datetime
#  name                              :string
#  slug                              :string
#  start_date                        :datetime
#  timepoint_day_interval            :integer          default(7)
#  tokens_per_word                   :float            default(3.25)
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  article_import_job_id             :string
#  generate_article_analytics_job_id :string
#  incremental_topic_build_job_id    :string
#  timepoint_generate_job_id         :string
#  users_import_job_id               :string
#  wiki_id                           :integer
#
