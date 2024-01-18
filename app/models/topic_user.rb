# frozen_string_literal: true

class TopicUser < ApplicationRecord
  belongs_to :topic
  belongs_to :user

  def self.ransackable_attributes(auth_object = nil)
    ["created_at", "id", "topic_id", "updated_at", "user_id"]
  end

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
