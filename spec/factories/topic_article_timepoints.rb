FactoryBot.define do
  factory :topic_article_timepoint do
  end
end

# == Schema Information
#
# Table name: topic_article_timepoints
#
#  id                               :bigint           not null, primary key
#  attributed_creation_at           :datetime
#  attributed_length_delta          :integer
#  attributed_revisions_count_delta :integer
#  attributed_token_count           :integer
#  attributed_token_count_delta     :integer
#  initial_attributed_token_count   :integer
#  length_delta                     :integer
#  revisions_count_delta            :integer
#  token_count_delta                :integer
#  created_at                       :datetime         not null
#  updated_at                       :datetime         not null
#  article_timepoint_id             :bigint           not null
#  attributed_creator_id            :bigint
#  topic_timepoint_id               :bigint           not null
#
# Indexes
#
#  index_topic_article_timepoints_on_article_timepoint_id   (article_timepoint_id)
#  index_topic_article_timepoints_on_attributed_creator_id  (attributed_creator_id)
#  index_topic_article_timepoints_on_topic_timepoint_id     (topic_timepoint_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_timepoint_id => article_timepoints.id)
#  fk_rails_...  (attributed_creator_id => users.id)
#  fk_rails_...  (topic_timepoint_id => topic_timepoints.id)
#
