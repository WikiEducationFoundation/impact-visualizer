# frozen_string_literal: true

class TopicArticleAnalytic < ApplicationRecord
  belongs_to :topic
  belongs_to :article

  validates :average_daily_views, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validates :topic_id, uniqueness: { scope: :article_id }

  scope :with_pageviews, -> { where.not(average_daily_views: 0) }
end
