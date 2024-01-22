# frozen_string_literal: true
json.cache! @topic_timepoints do
  json.topic_timepoints @topic_timepoints do |topic_timepoint|
    json.partial! 'topic_timepoints/topic_timepoint', topic_timepoint:
  end
end
