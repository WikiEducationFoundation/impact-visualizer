class TopicEditorTopic < ApplicationRecord
  belongs_to :topic
  belongs_to :topic_editor
end

# == Schema Information
#
# Table name: topic_editor_topics
#
#  id              :bigint           not null, primary key
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  topic_editor_id :bigint           not null
#  topic_id        :bigint           not null
#
# Indexes
#
#  index_topic_editor_topics_on_topic_editor_id  (topic_editor_id)
#  index_topic_editor_topics_on_topic_id         (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_editor_id => topic_editors.id)
#  fk_rails_...  (topic_id => topics.id)
#
