# frozen_string_literal: true

class ArticleBagArticle < ApplicationRecord
  # Associations
  belongs_to :article_bag
  belongs_to :article

  # For ActiveAdmin
  def self.ransackable_attributes(auth_object = nil)
    ["article_bag_id", "article_id", "created_at", "id", "updated_at"]
  end

end

# == Schema Information
#
# Table name: article_bag_articles
#
#  id             :bigint           not null, primary key
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  article_bag_id :bigint           not null
#  article_id     :bigint           not null
#
# Indexes
#
#  index_article_bag_articles_on_article_bag_id  (article_bag_id)
#  index_article_bag_articles_on_article_id      (article_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_bag_id => article_bags.id)
#  fk_rails_...  (article_id => articles.id)
#
