# frozen_string_literal: true
json.cache! @wikis do
  json.wikis @wikis do |wiki|
    json.extract! wiki, :id, :language, :project
  end
end
