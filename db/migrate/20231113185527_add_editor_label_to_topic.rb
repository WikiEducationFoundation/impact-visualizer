class AddEditorLabelToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :editor_label, :string, default: 'participant'
  end
end
