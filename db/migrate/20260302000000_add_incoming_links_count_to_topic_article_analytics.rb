# frozen_string_literal: true

class AddIncomingLinksCountToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    return if column_exists?(:topic_article_analytics, :incoming_links_count)

    add_column :topic_article_analytics, :incoming_links_count, :integer, null: false, default: 0
  end
end
