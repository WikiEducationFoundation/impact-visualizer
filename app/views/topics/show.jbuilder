# frozen_string_literal: true
json.cache! @topic do
  json.partial! 'topics/topic', topic: @topic
end
