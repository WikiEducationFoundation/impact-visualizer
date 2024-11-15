# frozen_string_literal: true

json.cache! @classifications do
  json.classifications @classifications do |classification|
    json.partial! 'classifications/classification', classification:
  end
end
