class AddTalkSizesToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_analytics, :talk_size, :integer
    add_column :topic_article_analytics, :prev_talk_size, :integer
  end
end 