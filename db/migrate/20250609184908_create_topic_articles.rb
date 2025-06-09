class CreateTopicArticles < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_articles do |t|
      t.bigint :topic_id, null: false
      t.bigint :article_id, null: false
      t.integer :average_daily_views, default: 0

      t.timestamps
    end

    add_foreign_key :topic_articles, :topics
    add_foreign_key :topic_articles, :articles
    add_index :topic_articles, [:topic_id, :article_id], unique: true
  end
end
