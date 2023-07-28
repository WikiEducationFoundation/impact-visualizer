class TopicSummary < ApplicationRecord
  belongs_to :topic
end

# == Schema Information
#
# Table name: topic_summaries
#
#  id                                :integer          not null, primary key
#  articles_count                    :integer
#  articles_count_delta              :integer
#  attributed_articles_created_delta :integer
#  attributed_length_delta           :integer
#  attributed_revisions_count_delta  :integer
#  attributed_token_count            :integer
#  attributed_token_count_delta      :integer
#  average_wp10_prediction           :float
#  length                            :integer
#  length_delta                      :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  timepoint_count                   :integer
#  token_count                       :integer
#  token_count_delta                 :integer
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :integer          not null
#
# Indexes
#
#  index_topic_summaries_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#
