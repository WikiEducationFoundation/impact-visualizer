# frozen_string_literal: true

owned = (current_topic_editor&.can_edit_topic?(topic) || current_admin_user&.can_edit_topic?(topic)) || false

json.extract! topic, :id, :name, :description, :end_date, :slug,
              :start_date, :timepoint_day_interval, :user_count, :editor_label,
              :chart_time_unit, :wiki_id, :articles_count, :missing_articles_count,
              :total_average_daily_visits, :users_csv_url,
              :users_csv_filename, :articles_csv_url, :articles_csv_filename,
              :timepoint_generate_job_id, :users_import_job_id, :article_import_job_id,
              :timepoints_count, :summaries_count, :tokens_per_word, :convert_tokens_to_words,
              :classification_ids

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
json.owned owned

if owned
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
                :users_import_status,
                :timepoint_generate_message,
                :incremental_topic_build_message
end

if topic.most_recent_summary
  json.extract! topic.most_recent_summary, :articles_count, :articles_count_delta,
                :attributed_articles_created_delta, :attributed_length_delta,
                :attributed_revisions_count_delta, :attributed_token_count,
                :average_wp10_prediction, :wp10_prediction_categories,
                :length, :length_delta, :classifications,
                :revisions_count, :revisions_count_delta,
                :token_count, :token_count_delta
end
