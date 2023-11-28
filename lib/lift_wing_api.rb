# frozen_string_literal: true

# Gets data from Lift Wing
# https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing
class LiftWingApi
  include ApiErrorHandling

  LIFT_WING_SERVER_URL = 'https://api.wikimedia.org'

  # All the wikis with an articlequality model as of 2023-06-28
  # https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing
  AVAILABLE_WIKIPEDIAS = %w[en eu fa fr gl nl pt ru sv tr uk].freeze

  def self.valid_wiki?(wiki)
    return true if wiki.project == 'wikidata'
    wiki.project == 'wikipedia' && AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def initialize(wiki = nil)
    wiki ||= Wiki.default_wiki
    raise InvalidProjectError unless LiftWingApi.valid_wiki?(wiki)
    @client = lift_wing_client
    @project_code = wiki.project == 'wikidata' ? 'wikidata' + 'wiki' : wiki.language + 'wiki'
    @project_quality_model = wiki.project == 'wikidata' ? 'itemquality' : 'articlequality'
  end

  def get_revision_quality(rev_id)
    body = { rev_id: }.to_json
    response = make_request('post', quality_query_url, body)

    if response&.status == 200
      parsed_response = Oj.load(response.body)
      return parsed_response.dig(@project_code, 'scores', rev_id.to_s,
                                 @project_quality_model, 'score').to_hashugar
    end

    ap "LiftWingApi Error: #{response}"
  end

  class InvalidProjectError < StandardError
  end

  private

  def quality_query_url
    "/service/lw/inference/v1/models/#{@project_code}-#{@project_quality_model}:predict"
  end

  def lift_wing_client
    token = Rails.application.credentials.dig(:wiki, :token)
    options = {
      url: LIFT_WING_SERVER_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: "Authorization: Bearer #{token}"
      }
    }
    connection = Faraday.new(options) do |faraday|
      faraday.response :raise_error
      faraday.adapter Faraday.default_adapter
    end
    connection
  end

  def make_request(action, url, params)
    total_tries = 3
    tries ||= 0
    response = @client.send(action, url, params)
  rescue StandardError => e
    status = e.response && e.response[:status]

    # Don't retry if missing revision
    if status != 400
      tries += 1
      unless Rails.env.test?
        sleep_time = 3**tries
        puts "LiftWingApi / Error – Retrying after #{sleep_time} seconds (#{tries}/#{total_tries}) "
        sleep sleep_time
      end
      retry unless tries == total_tries
    end

    log_error(e, response, false)
  end
end
