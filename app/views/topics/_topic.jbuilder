# frozen_string_literal: true

owned = (current_topic_editor&.can_edit_topic?(topic) || current_admin_user&.can_edit_topic?(topic)) || false

json.extract! topic, :id, :name, :description, :end_date, :slug,
              :start_date, :timepoint_day_interval, :user_count, :editor_label,
              :chart_time_unit, :wiki_id, :articles_count, :missing_articles_count,
              :total_average_daily_visits, :users_csv_url,
              :users_csv_filename, :articles_csv_url, :articles_csv_filename,
              :timepoint_generate_job_id, :users_import_job_id, :article_import_job_id,
              :timepoints_count, :summaries_count, :tokens_per_word, :convert_tokens_to_words,
              :classification_ids, :tb_handle

json.tokens_per_word_effective topic.tokens_per_word_effective
json.tokens_per_word_default topic.wiki&.tokens_per_word_default

if topic.wiki
  json.wiki do
    json.extract! topic.wiki, :id, :language, :project
  end
end

# json.classifications topic.topic_classifications do |topic_classification|
#   classification = topic_classification.classification
#   json.extract! classification, :id, :name, :properties
# end

json.has_stats topic.most_recent_summary.present?
json.has_analytics topic.article_analytics_exist?
json.data_updated_at topic.data_updated_at
json.owned owned

# Data-generation status — exposed to everyone so non-owners can see
# build progress on a topic detail page. The action endpoints
# (start/restart) and edit views remain owner-gated; the frontend hides
# the action UI for non-owners.
json.extract! topic, :timepoint_generate_percent_complete,
              :articles_import_percent_complete, :users_import_percent_complete,
              :articles_import_status, :timepoint_generate_status,
              :generate_article_analytics_status, :generate_article_analytics_percent_complete,
              :generate_article_analytics_message,
              :generate_article_analytics_articles_fetched,
              :generate_article_analytics_articles_total,
              :generate_article_analytics_skipped,
              :incremental_topic_build_percent_complete,
              :incremental_topic_build_status,
              :incremental_topic_build_stage_message,
              :incremental_topic_build_stage,
              :incremental_topic_build_at,
              :incremental_topic_build_total,
              :incremental_topic_build_timestamps_done,
              :incremental_topic_build_timestamps_total,
              :users_import_status,
              :timepoint_generate_message,
              :incremental_topic_build_message,
              :users_import_started_at,
              :articles_import_started_at,
              :generate_article_analytics_started_at,
              :incremental_topic_build_started_at,
              :timepoint_generate_started_at,
              :data_generation_state

if topic.most_recent_summary
  # NB: :articles_count is intentionally NOT extracted from the summary —
  # `topic.articles_count` (live, from the active bag) is already in the
  # JSON above. The summary captures it at build time, so after a bag
  # sync (add/remove articles) it would be stale until the next
  # incremental build finishes. All the other fields here are summary-
  # only deltas and stay snapshotted, which is the desired behavior.
  json.extract! topic.most_recent_summary, :articles_count_delta,
                :attributed_articles_created_delta, :attributed_length_delta,
                :attributed_revisions_count_delta, :attributed_token_count,
                :average_wp10_prediction, :wp10_prediction_categories,
                :length, :length_delta, :classifications,
                :revisions_count, :revisions_count_delta,
                :token_count, :token_count_delta
end
