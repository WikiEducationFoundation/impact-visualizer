# frozen_string_literal: true

class WikiRestApi
  include ApiErrorHandling

  AVAILABLE_WIKIPEDIAS = %w[en eu fa fr gl nl pt ru sv tr uk].freeze

  def self.valid_wiki?(wiki)
    return true if wiki.project == 'wikidata'
    wiki.project == 'wikipedia' && AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def initialize(wiki = nil)
    wiki ||= Wiki.default_wiki
    @api_url = wiki.rest_api_url
    raise InvalidProjectError unless WikiRestApi.valid_wiki?(wiki)
  end

  def get_page_edits_count(page_title:, from_rev_id: nil, to_rev_id: nil)
    params = nil
    if from_rev_id && to_rev_id
      params = {
        from: from_rev_id,
        to: to_rev_id
      }
    end
    title = page_title.tr(' ', '_')
    response = wiki_rest_server.get("page/#{title}/history/counts/edits", params)
    Oj.load(response.body)
  rescue StandardError => e
    log_error(e)
    return {}
  end

  class InvalidProjectError < StandardError
  end

  private

  def wiki_rest_server
    connection = Faraday.new(
      url: @api_url,
      headers: {
        'Content-Type': 'application/json'
      }
    )
    # connection.headers['User-Agent'] = ENV['visualizer_url'] + ' ' + Rails.env
    connection
  end
end
