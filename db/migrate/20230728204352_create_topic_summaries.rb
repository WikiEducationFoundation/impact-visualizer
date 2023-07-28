class CreateTopicSummaries < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_summaries do |t|
      t.integer :articles_count
      t.integer :articles_count_delta
      t.integer :attributed_articles_created_delta
      t.integer :attributed_length_delta
      t.integer :attributed_revisions_count_delta
      t.integer :attributed_token_count
      t.integer :attributed_token_count_delta
      t.integer :length
      t.integer :length_delta
      t.integer :revisions_count
      t.integer :revisions_count_delta
      t.integer :token_count
      t.integer :token_count_delta
      t.integer :timepoint_count
      t.float :average_wp10_prediction
      t.references :topic, null: false, foreign_key: true
      t.timestamps
    end
  end
end
