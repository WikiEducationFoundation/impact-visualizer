# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicUser do
  it { is_expected.to belong_to(:user) }
  it { is_expected.to belong_to(:topic) }
end

# == Schema Information
#
# Table name: topic_users
#
#  id         :integer          not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :integer          not null
#  user_id    :integer          not null
#
# Indexes
#
#  index_topic_users_on_topic_id  (topic_id)
#  index_topic_users_on_user_id   (user_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#  user_id   (user_id => users.id)
#
