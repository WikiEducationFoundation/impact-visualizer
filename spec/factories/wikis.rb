FactoryBot.define do
  factory :wiki do
    language { "MyString" }
    project { "MyString" }
  end
end

# == Schema Information
#
# Table name: wikis
#
#  id         :integer          not null, primary key
#  language   :string(16)
#  project    :string(16)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_wikis_on_language_and_project  (language,project) UNIQUE
#
