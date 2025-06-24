class AddPrevAverageDailyViewsToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_analytics, :prev_average_daily_views, :integer
  end
end 