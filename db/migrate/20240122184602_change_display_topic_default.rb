class ChangeDisplayTopicDefault < ActiveRecord::Migration[7.0]
  def change
    change_column_default :topics, :display, from: true, to: false
  end
end
