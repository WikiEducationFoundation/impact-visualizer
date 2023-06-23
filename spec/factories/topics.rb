FactoryBot.define do
  factory :topic do
    name { Faker::Space.galaxy }
    description { Faker::Lorem.sentence }
    slug { Faker::Internet.slug }
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                     :integer          not null, primary key
#  description            :string
#  name                   :string
#  slug                   :string
#  timepoint_day_interval :integer          default(7)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  wiki_id                :integer
#
