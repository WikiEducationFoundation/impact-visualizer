# frozen_string_literal: true

class AddWarningTagsAndImagesCountToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    unless column_exists?(:topic_article_analytics, :warning_tags_count)
      add_column :topic_article_analytics, :warning_tags_count, :integer, null: false, default: 0
    end

    unless column_exists?(:topic_article_analytics, :images_count)
      add_column :topic_article_analytics, :images_count, :integer, null: false, default: 0
    end
  end
end


