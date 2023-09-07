# frozen_string_literal: true

class TopicArticleTimepoint < ApplicationRecord
  # Associations
  belongs_to :topic_timepoint
  belongs_to :article_timepoint
  belongs_to :attributed_creator, class_name: 'User', optional: true

  # Delegates
  delegate :timestamp, to: :topic_timepoint
  delegate :topic, to: :topic_timepoint
  delegate :article, to: :article_timepoint
  delegate :revision_id, to: :article_timepoint

  ## Class Methods

  def self.find_by_topic_article_and_timestamp(topic:, article:, timestamp:)
    return nil unless topic && article && timestamp
    joins(topic_timepoint: [:topic], article_timepoint: [:article])
      .where('topics.id = ? AND
              articles.id = ? AND
              topic_timepoints.timestamp = ?',
             topic.id,
             article.id,
             timestamp.to_date)
      .first
  end

  def self.find_latest_for_article_and_topic(topic:, article:)
    return nil unless topic && article
    joins(topic_timepoint: [:topic], article_timepoint: [:article])
      .where('topics.id = ? AND
              articles.id = ?',
             topic.id,
             article.id)
      .order('topic_timepoints.timestamp DESC')
      .first
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
