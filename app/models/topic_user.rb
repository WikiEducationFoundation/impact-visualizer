# frozen_string_literal: true

class TopicUser < ApplicationRecord
  belongs_to :topic
  belongs_to :user
end

# == Schema Information
#
# Table name: topic_users
#
#  id         :bigint           not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :bigint           not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_topic_users_on_topic_id  (topic_id)
#  index_topic_users_on_user_id   (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#  fk_rails_...  (user_id => users.id)
#
