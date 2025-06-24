class AddLeadSectionSizesToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_analytics, :lead_section_size, :integer
  end
end 