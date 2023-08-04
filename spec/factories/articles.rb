FactoryBot.define do
  factory :article do
    pageid { 2364730 }
    title { 'Yankari Game Reserve' }
    first_revision_at { Date.new(2020, 1, 1) }
    first_revision_by_name { 'username' }
    first_revision_by_id { 1234 }
    first_revision_id { 3456 }
  end
end

# == Schema Information
#
# Table name: articles
#
#  id                     :bigint           not null, primary key
#  first_revision_at      :datetime
#  first_revision_by_name :string
#  pageid                 :integer
#  title                  :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  first_revision_by_id   :integer
#  first_revision_id      :integer
#
