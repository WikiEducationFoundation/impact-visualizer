# frozen_string_literal: true

class WikiRestApi
  include ApiErrorHandling

  AVAILABLE_WIKIPEDIAS = %w[en eu fa fr gl nl pt ru sv tr uk].freeze

  def initialize(wiki)
    @api_url = wiki.rest_api_url
    @client = wiki_rest_server
    raise InvalidProjectError unless WikiRestApi.valid_wiki?(wiki)
  end

  def self.valid_wiki?(wiki)
    return true if wiki.project == 'wikidata'
    wiki.project == 'wikipedia' && AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def get_page_edits_count(page_title:, from_rev_id: nil, to_rev_id: nil)
    params = nil
    if from_rev_id && to_rev_id
      params = {
        from: from_rev_id,
        to: to_rev_id
      }
    end
    title = URI::DEFAULT_PARSER.escape(page_title.tr(' ', '_'))
    response = make_request('get', "page/#{title}/history/counts/edits", params)
    Oj.load(response.body).to_hashugar
  end

  class InvalidProjectError < StandardError
  end

  private

  def wiki_rest_server
    options = {
      url: @api_url,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    connection = Faraday.new(options) do |faraday|
      faraday.response :raise_error
      faraday.adapter Faraday.default_adapter
    end
    # connection.headers['User-Agent'] = ENV['visualizer_url'] + ' ' + Rails.env
    connection
  end

  def make_request(action, url, params)
    tries ||= 3
    @client.send(action, url, params)
  rescue StandardError => e
    tries -= 1
    # Continue for typical errors so that the request can be retried, but wait
    # a short bit in the case of 429 — too many request — errors.
    if too_many_requests?(e)
      unless Rails.env.test?
        ap "WikiRestApi / Too many requests – Trys remaining: #{tries}"
        sleep 1
      end
      retry unless tries.zero?
    else
      unless Rails.env.test?
        ap url
        ap params
        ap e
      end
    end
    ap e.response
    raise e
  end

  def too_many_requests?(e)
    return false unless e.instance_of?(Faraday::ClientError)
    e.response[:status] == 429
  end
end
