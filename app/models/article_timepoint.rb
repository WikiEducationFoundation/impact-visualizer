# frozen_string_literal: true

class ArticleTimepoint < ApplicationRecord
  ## TODO
  # - Add wp10_prediction

  ## Associations
  belongs_to :article

  ## Class Methods
  def self.find_or_create_for_timestamp(article:, timestamp:)
    unless article.first_revision_info?
      raise ImpactVisualizerErrors::ArticleMissingFirstRevisionInfo
    end

    unless article.exists_at_timestamp?(timestamp)
      raise ImpactVisualizerErrors::ArticleCreatedAfterTimestamp
    end

    ArticleTimepoint.find_or_create_by!(
      timestamp:, article:
    )
  end
end

# == Schema Information
#
# Table name: article_timepoints
#
#  id              :integer          not null, primary key
#  article_length  :integer
#  revisions_count :integer
#  timestamp       :date
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  article_id      :integer          not null
#  revision_id     :integer
#
# Indexes
#
#  index_article_timepoints_on_article_id  (article_id)
#
# Foreign Keys
#
#  article_id  (article_id => articles.id)
#
