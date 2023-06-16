class Topic < ApplicationRecord

  # TODO
  # - High-level caching of deltas between first/last topic_timepoints.
  #   Perhaps with another model though? ... so snapshots can be taken over time. 

  # Associations
  has_many :article_bags
  has_many :articles, through: :article_bags
  has_many :topic_users
  has_many :users, through: :topic_users
  has_many :topic_timepoints

end

# == Schema Information
#
# Table name: topics
#
#  id          :integer          not null, primary key
#  description :string
#  name        :string
#  slug        :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
