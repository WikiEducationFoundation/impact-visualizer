# frozen_string_literal: true

# Gets token attribution from WikiWho
# https://wikiwho-api.wmcloud.org/en/api/v1.0.0-beta/
class WikiWhoApi
  include ApiErrorHandling

  WIKI_WHO_SERVER_URL = 'https://wikiwho-api.wmcloud.org/'
  WIKI_WHO_API_PATH = '/api/v1.0.0-beta/'

  AVAILABLE_WIKIPEDIAS = %w[ar de en es eu fr hu id it ja nl pl pt tr].freeze

  def self.valid_wiki_language?(wiki)
    AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def initialize(wiki:)
    raise InvalidLanguageError unless WikiWhoApi.valid_wiki_language?(wiki)
    @wiki = wiki
  end

  def get_revision_tokens(revision_id)
    url_query = query_url(revision_id)
    response = wiki_who_server.get(url_query)
    response_body = response.body
    wiki_who_data = Oj.load(response_body)
    wiki_who_data.dig('revisions', 0, revision_id.to_s, 'tokens')
  rescue StandardError => e
    log_error(e)
    return {}
  end

  class InvalidLanguageError < StandardError
  end

  private

  def query_url(rev_id)
    "#{@wiki.language}#{WIKI_WHO_API_PATH}rev_content/rev_id/#{rev_id}/?editor=true&o_rev_id=true"
  end

  def wiki_who_server
    conn = Faraday.new(url: WIKI_WHO_SERVER_URL)
    conn
  end
end
