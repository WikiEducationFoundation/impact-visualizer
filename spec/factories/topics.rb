FactoryBot.define do
  factory :topic do
    name { Faker::Space.galaxy }
    description { Faker::Lorem.sentence }
    slug { Faker::Internet.slug }
    wiki { Wiki.default_wiki }
    display { true }

    after(:create) do |topic, _evaluator|
      ArticleBag.create(topic:, name: "#{topic.slug.titleize} Articles")
    end
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                                :bigint           not null, primary key
#  chart_time_unit                   :string           default("year")
#  convert_tokens_to_words           :boolean          default(FALSE)
#  description                       :string
#  display                           :boolean          default(FALSE)
#  editor_label                      :string           default("participant")
#  end_date                          :datetime
#  name                              :string
#  slug                              :string
#  start_date                        :datetime
#  timepoint_day_interval            :integer          default(7)
#  tokens_per_word                   :float            default(3.25)
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  article_import_job_id             :string
#  generate_article_analytics_job_id :string
#  incremental_topic_build_job_id    :string
#  timepoint_generate_job_id         :string
#  users_import_job_id               :string
#  wiki_id                           :integer
#
