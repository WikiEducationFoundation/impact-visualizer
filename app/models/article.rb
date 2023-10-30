# frozen_string_literal: true

class Article < ApplicationRecord
  ## Associations
  has_many :article_bag_articles
  has_many :article_bags, through: :article_bag_articles
  has_many :article_timepoints

  ## Instance Methods
  def exists_at_timestamp?(timestamp)
    raise ImpactVisualizerErrors::ArticleMissingFirstRevisionInfo.new(id) unless first_revision_info?
    first_revision_at < timestamp
  end

  def first_revision_info?
    first_revision_id.present? &&
      first_revision_by_name.present? &&
      first_revision_by_id.present? &&
      first_revision_at.present?
  end

  def details?
    pageid.present? && title.present?
  end

  def update_details
    stats_service = ArticleStatsService.new
    stats_service.update_details_for_article(article: self)
  end

  ## Class Methods
  def self.update_details_for_all_articles
    total_count = Article.count
    Article.all.each_with_index do |article, index|
      ap "Updating #{index + 1}/#{total_count}"
      article.update_details
    end
  end
end

# == Schema Information
#
# Table name: articles
#
#  id                     :bigint           not null, primary key
#  first_revision_at      :datetime
#  first_revision_by_name :string
#  pageid                 :integer
#  title                  :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  first_revision_by_id   :integer
#  first_revision_id      :integer
#
