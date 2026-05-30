# frozen_string_literal: true
FactoryBot.define do
  factory :topic_timepoint do
    articles_count { Faker::Number.number(digits: 5) }
    articles_count_delta { Faker::Number.number(digits: 5) }
    attributed_articles_created_delta { Faker::Number.number(digits: 5) }
    attributed_length_delta { Faker::Number.number(digits: 5) }
    attributed_revisions_count_delta { Faker::Number.number(digits: 5) }
    attributed_token_count { Faker::Number.number(digits: 5) }
    average_wp10_prediction { Faker::Number.number(digits: 2) }
    length { Faker::Number.number(digits: 5) }
    length_delta { Faker::Number.number(digits: 5) }
    revisions_count { Faker::Number.number(digits: 5) }
    revisions_count_delta { Faker::Number.number(digits: 5) }
    timestamp { Faker::Date.backward(days: 365) }
    token_count { Faker::Number.number(digits: 5) }
    token_count_delta { Faker::Number.number(digits: 5) }
    topic { Topic.first || create(:topic) }
  end
end

# == Schema Information
#
# Table name: topic_timepoints
#
#  id                                :bigint           not null, primary key
#  articles_count                    :integer
#  articles_count_delta              :integer
#  attributed_articles_created_delta :integer
#  attributed_length_delta           :bigint
#  attributed_revisions_count_delta  :bigint
#  attributed_token_count            :bigint
#  average_wp10_prediction           :float
#  classifications                   :jsonb
#  length                            :bigint
#  length_delta                      :bigint
#  revisions_count                   :bigint
#  revisions_count_delta             :bigint
#  timestamp                         :date
#  token_count                       :bigint
#  token_count_delta                 :bigint
#  wp10_prediction_categories        :jsonb
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :bigint           not null
#
# Indexes
#
#  index_topic_timepoints_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#
