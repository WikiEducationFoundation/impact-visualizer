class CreateWikis < ActiveRecord::Migration[7.0]
  def change
    create_table :wikis do |t|
      t.string :language, limit: 16
      t.string :project, limit: 16
      t.timestamps
    end

    add_index :wikis, [:language, :project], unique: true

    default_wiki = Wiki.find_or_create_by(
      language: 'en',
      project: 'wikipedia'
    )

    add_column :topics, :wiki_id, :integer, index: true
  end
end
