# frozen_string_literal: true

json.cache! @topics do
  json.topics @topics do |topic|
    json.partial! 'topics/topic', topic:
  end
end
