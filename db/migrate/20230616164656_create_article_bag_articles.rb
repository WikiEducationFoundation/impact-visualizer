class CreateArticleBagArticles < ActiveRecord::Migration[7.0]
  def change
    create_table :article_bag_articles do |t|
      t.references :article_bag, null: false, foreign_key: true
      t.references :article, null: false, foreign_key: true

      t.timestamps
    end
  end
end
