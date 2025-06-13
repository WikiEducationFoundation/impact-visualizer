class AddPrevArticleSizeToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_analytics, :prev_article_size, :integer
  end
end 