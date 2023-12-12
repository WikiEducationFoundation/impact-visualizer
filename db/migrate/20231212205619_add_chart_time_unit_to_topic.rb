class AddChartTimeUnitToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :chart_time_unit, :string, default: 'year'
  end
end
