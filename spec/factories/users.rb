FactoryBot.define do
  factory :user do
    wiki_user_id { 1 }
    name { "MyString" }
  end
end

# == Schema Information
#
# Table name: users
#
#  id           :integer          not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  wiki_user_id :integer
#
