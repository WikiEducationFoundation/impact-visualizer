# frozen_string_literal: true
FactoryBot.define do
  factory :topic_summary do
    topic do
      Topic.first || create(:topic)
    end
  end
end

# == Schema Information
#
# Table name: topic_summaries
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
#  missing_articles_count            :integer
#  revisions_count                   :bigint
#  revisions_count_delta             :bigint
#  timepoint_count                   :integer
#  token_count                       :bigint
#  token_count_delta                 :bigint
#  wp10_prediction_categories        :jsonb
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :bigint           not null
#
# Indexes
#
#  index_topic_summaries_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#
