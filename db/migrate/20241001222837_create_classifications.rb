class CreateClassifications < ActiveRecord::Migration[7.0]
  def change
    create_table :classifications do |t|
      t.string :name
      t.jsonb :prerequisites
      t.jsonb :properties
      t.timestamps
    end
  end
end
