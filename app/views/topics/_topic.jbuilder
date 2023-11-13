# frozen_string_literal: true

json.extract! topic, :id, :name, :description, :end_date, :slug,
              :start_date, :timepoint_day_interval, :user_count, :editor_label

if topic.most_recent_summary
  json.extract! topic.most_recent_summary, :articles_count, :articles_count_delta,
                :attributed_articles_created_delta, :attributed_length_delta,
                :attributed_revisions_count_delta, :attributed_token_count,
                :average_wp10_prediction, :wp10_prediction_categories,
                :length, :length_delta,
                :revisions_count, :revisions_count_delta,
                :token_count, :token_count_delta
end
