# frozen_string_literal: true

json.topics @topics do |topic|
  json.partial! 'topics/topic', topic:
end
