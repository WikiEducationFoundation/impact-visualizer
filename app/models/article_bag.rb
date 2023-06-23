# frozen_string_literal: true

class ArticleBag < ApplicationRecord
  # Associations
  belongs_to :topic
  has_many :article_bag_articles
  has_many :articles, through: :article_bag_articles
end

# == Schema Information
#
# Table name: article_bags
#
#  id         :integer          not null, primary key
#  name       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :integer          not null
#
# Indexes
#
#  index_article_bags_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#
