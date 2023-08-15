# frozen_string_literal: true

class ArticleTimepoint < ApplicationRecord
  ## Associations
  belongs_to :article

  ## Delegates
  delegate :first_revision_id, to: :article

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
    ) do
      # Block is yielded only for "created" records
      yield if block_given?
    end
  end
end

# == Schema Information
#
# Table name: article_timepoints
#
#  id              :bigint           not null, primary key
#  article_length  :integer
#  revisions_count :integer
#  timestamp       :date
#  token_count     :integer
#  wp10_prediction :float
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  article_id      :bigint           not null
#  revision_id     :integer
#
# Indexes
#
#  index_article_timepoints_on_article_id  (article_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_id => articles.id)
#
