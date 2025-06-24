class AddArticleSizeToTopicArticleAnalytics < ActiveRecord::Migration[6.1]
  def change
    add_column :topic_article_analytics, :article_size, :integer
  end
end 