class AddJobIdsToTopic < ActiveRecord::Migration[7.0]
  def change
    add_column :topics, :users_import_job_id, :string
    add_column :topics, :article_import_job_id, :string
    add_column :topics, :timepoint_generate_job_id, :string
  end
end
