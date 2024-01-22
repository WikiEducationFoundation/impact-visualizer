FactoryBot.define do
  factory :topic do
    name { Faker::Space.galaxy }
    description { Faker::Lorem.sentence }
    slug { Faker::Internet.slug }
    wiki { Wiki.default_wiki }
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                     :bigint           not null, primary key
#  chart_time_unit        :string           default("year")
#  description            :string
#  display                :boolean          default(FALSE)
#  editor_label           :string           default("participant")
#  end_date               :datetime
#  name                   :string
#  slug                   :string
#  start_date             :datetime
#  timepoint_day_interval :integer          default(7)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  wiki_id                :integer
#
