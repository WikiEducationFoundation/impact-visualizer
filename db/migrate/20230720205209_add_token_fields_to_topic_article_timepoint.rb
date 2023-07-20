class AddTokenFieldsToTopicArticleTimepoint < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_article_timepoints, :token_count_delta, :integer
    add_column :topic_article_timepoints, :initial_attributed_token_count, :integer
    add_column :topic_article_timepoints, :attributed_token_count, :integer
    add_column :topic_article_timepoints, :attributed_token_count_delta, :integer
  end
end
