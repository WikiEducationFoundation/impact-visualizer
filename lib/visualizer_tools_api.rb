# frozen_string_literal: true

class VisualizerToolsApi
  include ApiErrorHandling

  AVAILABLE_WIKIPEDIAS = %w[en eu fa fr gl nl pt ru sv tr uk].freeze

  def initialize(wiki = nil)
    wiki ||= Wiki.default_wiki
    @client = impact_visualizer_tools_client
    raise InvalidProjectError unless VisualizerToolsApi.valid_wiki?(wiki)
  end

  def self.valid_wiki?(wiki)
    return true if wiki.project == 'wikidata'
    wiki.project == 'wikipedia' && AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def get_page_edits_count(page_id:, from_rev_id: nil, to_rev_id: nil)
    params = { page_id: }
    if from_rev_id && to_rev_id
      params[:from_rev_id] = from_rev_id
      params[:to_rev_id] = to_rev_id
    end
    response = make_request('get', 'count_revisions.php', params)

    if response&.status == 200
      parsed_response = Oj.load(response.body)
      return parsed_response.dig('data', 0, 'count').to_i
    end

    ap "VisualizerToolsApi Error: #{response}"
  end

  class InvalidProjectError < StandardError
  end

  private

  def impact_visualizer_tools_client
    options = {
      url: 'https://impact-visualizer-tools.wmcloud.org',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    connection = Faraday.new(options) do |faraday|
      faraday.response :raise_error
      faraday.adapter Faraday.default_adapter
    end
    connection
  end

  def make_request(action, url, params)
    tries ||= 0
    response = @client.send(action, url, params)
  rescue StandardError => e
    tries += 1
    unless Rails.env.test?
      puts "VisualizerToolsApi / Error – Trys remaining: #{tries}"
      sleep 1 * tries
    end
    retry unless tries == 3
    log_error(e, response)
  end

  def too_many_requests?(e)
    return false unless e.instance_of?(Faraday::ClientError)
    e.response[:status] == 429
  end
end
