class AddDisplayToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :display, :boolean, default: true
  end
end
