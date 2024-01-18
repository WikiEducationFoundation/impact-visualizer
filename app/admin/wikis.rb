ActiveAdmin.register Wiki do
  filter :topics

  permit_params :language, :project

  index do
    column :id
    column :project
    column :language
    column :topics
    actions
  end
end

# == Schema Information
#
# Table name: wikis
#
#  id         :bigint           not null, primary key
#  language   :string(16)
#  project    :string(16)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_wikis_on_language_and_project  (language,project) UNIQUE
#
