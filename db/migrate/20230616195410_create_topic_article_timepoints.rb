class CreateTopicArticleTimepoints < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_article_timepoints do |t|
      t.integer :length_delta
      t.integer :revisions_count_delta
      t.integer :attributed_length_delta
      t.integer :attributed_revisions_count_delta
      t.datetime :attributed_creation_at

      t.references :topic_timepoint, null: false, foreign_key: true
      t.references :article_timepoint, null: false, foreign_key: true
      t.references :attributed_creator, index: true, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
