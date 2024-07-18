# frozen_string_literal: true
json.cache_if! @enable_caching, [@topic] do
  json.partial! 'topics/topic', topic: @topic
end
