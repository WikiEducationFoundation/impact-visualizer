# frozen_string_literal: true

class AddPublicationDateToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def up
    add_column :topic_article_analytics, :publication_date, :date
  end

  def down
    remove_column :topic_article_analytics, :publication_date
  end
end


