class User < ApplicationRecord

  # Associations
  has_many :topic_users
  has_many :topics, through: :topic_users

end

# == Schema Information
#
# Table name: users
#
#  id           :integer          not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  wiki_user_id :integer
#
