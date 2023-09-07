# frozen_string_literal: true

json.extract! topic_timepoint, :id, :articles_count, :articles_count_delta,
              :attributed_articles_created_delta, :attributed_length_delta,
              :attributed_revisions_count_delta, :attributed_token_count,
              :average_wp10_prediction, :length, :length_delta,
              :revisions_count, :revisions_count_delta,
              :timestamp, :token_count, :token_count_delta
