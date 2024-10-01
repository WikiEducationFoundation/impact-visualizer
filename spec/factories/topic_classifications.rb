FactoryBot.define do
  factory :topic_classification do
    classification { nil }
    topic { nil }
  end
end

# == Schema Information
#
# Table name: topic_classifications
#
#  id                :bigint           not null, primary key
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  classification_id :bigint           not null
#  topic_id          :bigint           not null
#
# Indexes
#
#  index_topic_classifications_on_classification_id  (classification_id)
#  index_topic_classifications_on_topic_id           (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (classification_id => classifications.id)
#  fk_rails_...  (topic_id => topics.id)
#
