# frozen_string_literal: true

class AddNumberOfEditorsToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    return if column_exists?(:topic_article_analytics, :number_of_editors)

    add_column :topic_article_analytics, :number_of_editors, :integer, null: false, default: 0
  end
end


