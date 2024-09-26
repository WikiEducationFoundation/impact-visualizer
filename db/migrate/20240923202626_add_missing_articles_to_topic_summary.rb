class AddMissingArticlesToTopicSummary < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_summaries, :missing_articles_count, :integer
  end
end
