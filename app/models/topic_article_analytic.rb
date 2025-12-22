# frozen_string_literal: true

class TopicArticleAnalytic < ApplicationRecord
  belongs_to :topic
  belongs_to :article

  validates :average_daily_views, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validates :article_size, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :prev_article_size, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :topic_id, uniqueness: { scope: :article_id }
  validates :talk_size, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :prev_talk_size, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :lead_section_size, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :prev_average_daily_views,
            numericality: { greater_than_or_equal_to: 0, allow_nil: true }

  scope :with_pageviews, -> { where.not(average_daily_views: 0) }
  scope :with_size, -> { where.not(article_size: nil) }
end

# == Schema Information
#
# Table name: topic_article_analytics
#
#  id                        :bigint           not null, primary key
#  article_size              :integer
#  assessment_grade          :string
#  average_daily_views       :integer          default(0)
#  images_count              :integer          default(0), not null
#  lead_section_size         :integer
#  linguistic_versions_count :integer          default(0), not null
#  prev_article_size         :integer
#  prev_average_daily_views  :integer
#  prev_talk_size            :integer
#  publication_date          :date
#  talk_size                 :integer
#  warning_tags_count        :integer          default(0), not null
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  article_id                :bigint           not null
#  topic_id                  :bigint           not null
#
# Indexes
#
#  index_topic_article_analytics_on_topic_id_and_article_id  (topic_id,article_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (article_id => articles.id)
#  fk_rails_...  (topic_id => topics.id)
#
