# frozen_string_literal: true

class Article < ApplicationRecord
  ## Associations
  belongs_to :wiki
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
    stats_service = ArticleStatsService.new(wiki)
    stats_service.update_details_for_article(article: self)
  end

  ## Class Methods
  def self.update_details_for_all_articles
    total_count = Article.count
    counter = 0
    Article.all.in_batches(of: 500) do |batch|
      Parallel.each(batch, in_threads: 25) do |article|
        ActiveRecord::Base.connection_pool.with_connection do
          counter += 1
          ap "Updating #{counter}/#{total_count}"
          article.update_details
          ActiveRecord::Base.connection_pool.release_connection
        end
      end
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
#  wiki_id                :bigint           not null
#
# Indexes
#
#  index_articles_on_wiki_id  (wiki_id)
#
# Foreign Keys
#
#  fk_rails_...  (wiki_id => wikis.id)
#
