class AddWikiToUser < ActiveRecord::Migration[7.0]
  def change
    # Set existing Users to English
    default_wiki_id = Wiki.default_wiki.id
    add_reference :users, :wiki, null: false, foreign_key: true, default: default_wiki_id
    
    # Change default back for new Users
    # https://dev.to/mattiaorfano/rails-addreference-with-null-constraint-on-existing-table-4n6n
    change_column_default :users, :wiki_id, nil
  end
end
