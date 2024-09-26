class AddMissingToArticle < ActiveRecord::Migration[7.0]
  def change
    add_column :articles, :missing, :boolean, default: false
  end
end
