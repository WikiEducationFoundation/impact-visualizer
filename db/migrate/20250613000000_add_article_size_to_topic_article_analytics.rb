class AddArticleSizeToTopicArticleAnalytics < ActiveRecord::Migration[6.1]
  def change
    unless column_exists?(:topic_article_analytics, :article_size)
      add_column :topic_article_analytics, :article_size, :integer
    end
  end
end