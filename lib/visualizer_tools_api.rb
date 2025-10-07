# frozen_string_literal: true

class VisualizerToolsApi
  include ApiErrorHandling

  AVAILABLE_WIKIPEDIAS = %w[en de eu fa fr gl nl pt ru sv tr uk].freeze

  def initialize(wiki)
    @wiki = wiki
    @client = impact_visualizer_tools_client
    raise InvalidProjectError unless VisualizerToolsApi.valid_wiki?(@wiki)
  end

  def self.valid_wiki?(wiki)
    return true if wiki.project == 'wikidata'
    wiki.project == 'wikipedia' && AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def get_page_edits_count(page_id:, from_rev_id: nil, to_rev_id: nil)
    params = {
      page_id:,
      lang: @wiki.language,
      project: @wiki.project
    }
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
      url: Features.tools_base_url,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    connection = Faraday.new(options) do |faraday|
      faraday.response :raise_error
      faraday.adapter Faraday.default_adapter
    end
    connection.headers['User-Agent'] = Features.user_agent
    connection
  end

  def make_request(action, url, params)
    tries ||= 0
    response = @client.send(action, url, params)
  rescue StandardError => e
    tries += 1
    status = e.response && e.response[:status]
    if status == 429
      retry_after = (e.response && (e.response[:headers]['retry-after'] || e.response[:headers]['Retry-After']))
      wait_seconds = retry_after.to_i if retry_after
      wait_seconds = [wait_seconds || 0, 1].max
      wait_seconds = [wait_seconds, 30].min
      wait_seconds += rand(0.0..0.5)
      unless Rails.env.test?
        puts "VisualizerToolsApi / 429 Too Many Requests - waiting #{wait_seconds.round(2)}s (attempt #{tries}/3)"
        sleep wait_seconds
      end
    else
      unless Rails.env.test?
        puts "VisualizerToolsApi / Error - attempt #{tries}/3"
        sleep 1 * tries
      end
    end
    retry unless tries == 3
    log_error(e, response)
  end

  def too_many_requests?(e)
    return false unless e.instance_of?(Faraday::ClientError)
    e.response[:status] == 429
  end
end
