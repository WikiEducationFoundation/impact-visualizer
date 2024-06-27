# frozen_string_literal: true
json.cache! [@topic, current_topic_editor] do
  json.partial! 'topics/topic', topic: @topic
end
