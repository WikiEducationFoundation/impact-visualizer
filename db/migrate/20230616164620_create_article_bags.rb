class CreateArticleBags < ActiveRecord::Migration[7.0]
  def change
    create_table :article_bags do |t|
      t.string :name
      t.references :topic, null: false, foreign_key: true

      t.timestamps
    end
  end
end
