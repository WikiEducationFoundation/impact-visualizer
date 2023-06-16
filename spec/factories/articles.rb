FactoryBot.define do
  factory :article do
    title { "MyString" }
    page_id { 1 }
  end
end

# == Schema Information
#
# Table name: articles
#
#  id         :integer          not null, primary key
#  title      :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  page_id    :integer
#
