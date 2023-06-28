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

  def initialize(wiki)
    raise InvalidProjectError unless LiftWingApi.valid_wiki?(wiki)
    @project_code = wiki.project == 'wikidata' ? 'wikidata' + 'wiki' : wiki.language + 'wiki'
    @project_quality_model = wiki.project == 'wikidata' ? 'itemquality' : 'articlequality'
  end

  def get_revision_quality(rev_id)
    body = { rev_id: }.to_json
    response = lift_wing_server.post(quality_query_url, body)
    Oj.load(response.body)
  rescue StandardError => e
    log_error(e)
    return {}
  end

  class InvalidProjectError < StandardError
  end

  private

  def quality_query_url
    "/service/lw/inference/v1/models/#{@project_code}-#{@project_quality_model}:predict"
  end

  def lift_wing_server
    connection = Faraday.new(
      url: LIFT_WING_SERVER_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    )
    # connection.headers['User-Agent'] = ENV['visualizer_url'] + ' ' + Rails.env
    connection
  end
end
