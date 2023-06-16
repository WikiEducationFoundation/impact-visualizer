class CreateTopicTimepoints < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_timepoints do |t|
      t.integer :length
      t.integer :length_delta
      t.integer :links_count
      t.integer :links_count_delta
      t.integer :articles_count
      t.integer :articles_count_delta
      t.integer :revisions_count
      t.integer :revisions_count_delta
      t.integer :attributed_length_delta
      t.integer :attributed_links_count_delta
      t.integer :attributed_revisions_count_delta
      t.integer :attributed_articles_created_delta
      t.references :topic, null: false, foreign_key: true

      t.timestamps
    end
  end
end
