FactoryBot.define do
  factory :user do
    wiki_user_id { 1 }
    name { 'MyString' }
    wiki { Wiki.default_wiki }
  end
end

# == Schema Information
#
# Table name: users
#
#  id           :bigint           not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  wiki_id      :bigint           not null
#  wiki_user_id :integer
#
# Indexes
#
#  index_users_on_wiki_id  (wiki_id)
#
# Foreign Keys
#
#  fk_rails_...  (wiki_id => wikis.id)
#
