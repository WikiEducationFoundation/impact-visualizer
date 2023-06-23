class CreateTopics < ActiveRecord::Migration[7.0]
  def change
    create_table :topics do |t|
      t.string :name
      t.string :description
      t.string :slug
      t.integer :timepoint_day_interval, default: 7

      t.timestamps
    end
  end
end
