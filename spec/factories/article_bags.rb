FactoryBot.define do
  factory :article_bag do
    name { "MyString" }
    topic { nil }
  end
end

# == Schema Information
#
# Table name: article_bags
#
#  id         :integer          not null, primary key
#  name       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :integer          not null
#
# Indexes
#
#  index_article_bags_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#
