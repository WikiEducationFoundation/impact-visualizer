class CreateArticleTimepoints < ActiveRecord::Migration[7.0]
  def change
    create_table :article_timepoints do |t|
      t.integer :revision_id
      t.integer :previous_revision_id
      t.integer :article_length
      t.integer :links_count
      t.integer :revisions_count
      t.references :article, null: false, foreign_key: true
      t.timestamps
    end
  end
end
