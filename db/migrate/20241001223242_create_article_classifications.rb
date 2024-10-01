class CreateArticleClassifications < ActiveRecord::Migration[7.0]
  def change
    create_table :article_classifications do |t|
      t.references :classification, null: false, foreign_key: true
      t.references :article, null: false, foreign_key: true
      t.jsonb :properties

      t.timestamps
    end
  end
end
