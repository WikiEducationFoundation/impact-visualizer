class CreateArticles < ActiveRecord::Migration[7.0]
  def change
    create_table :articles do |t|
      t.string :title
      t.integer :pageid

      t.timestamps
    end
  end
end
