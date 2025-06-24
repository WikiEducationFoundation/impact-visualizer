class AddArticleAnalyticsJobIdToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :generate_article_analytics_job_id, :string
  end
end
