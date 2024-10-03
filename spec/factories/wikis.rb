FactoryBot.define do
  factory :wiki do
    language { 'en' }
    project { 'wikipedia' }
    wikidata_site { 'enwiki' }
  end
end

# == Schema Information
#
# Table name: wikis
#
#  id            :bigint           not null, primary key
#  language      :string(16)
#  project       :string(16)
#  wikidata_site :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  index_wikis_on_language_and_project  (language,project) UNIQUE
#
