# frozen_string_literal: true

class AddArticleProtectionsToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_analytics, :article_protections, :jsonb, null: false, default: []
  end
end


