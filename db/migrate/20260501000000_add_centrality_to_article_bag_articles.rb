# frozen_string_literal: true

class AddCentralityToArticleBagArticles < ActiveRecord::Migration[7.0]
  def change
    return if column_exists?(:article_bag_articles, :centrality)

    add_column :article_bag_articles, :centrality, :integer
  end
end
