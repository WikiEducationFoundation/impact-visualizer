# frozen_string_literal: true

class Article < ApplicationRecord
  ## Associations
  has_many :article_bag_articles
  has_many :article_bags, through: :article_bag_articles
  has_many :article_timepoints

  ## Instance Methods
  def exists_at_timestamp?(timestamp)
    raise ImpactVisualizerErrors::ArticleMissingFirstRevisionInfo unless first_revision_info?
    first_revision_at < timestamp
  end

  def first_revision_info?
    first_revision_id.present? &&
      first_revision_by_name.present? &&
      first_revision_by_id.present? &&
      first_revision_at.present?
  end
end

# == Schema Information
#
# Table name: articles
#
#  id                     :integer          not null, primary key
#  first_revision_at      :datetime
#  first_revision_by_name :string
#  pageid                 :integer
#  title                  :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  first_revision_by_id   :integer
#  first_revision_id      :integer
#
