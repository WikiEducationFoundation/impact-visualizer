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
    # response = wiki_who_server.get(url_query)
    response = make_request(url_query)

    if response&.status == 200
      response_body = response.body
      wiki_who_data = Oj.load(response_body)
      return wiki_who_data.dig('revisions', 0, revision_id.to_s, 'tokens').to_hashugar
    end

    if response&.status == 400
      return nil
    end

    raise RevisionTokenError, "status: #{response&.status || "nil"} / revision_id: #{revision_id}"
  end

  class InvalidLanguageError < StandardError
  end

  class RevisionTokenError < StandardError
  end

  private

  def query_url(rev_id)
    "#{@wiki.language}#{WIKI_WHO_API_PATH}rev_content/rev_id/#{rev_id}/?editor=true&o_rev_id=true"
  end

  def wiki_who_server
    options = {
      url: WIKI_WHO_SERVER_URL
    }
    conn = Faraday.new(options) do |faraday|
      faraday.response :raise_error
      faraday.adapter Faraday.default_adapter
    end
    conn
  end

  def make_request(url_query)
    total_tries = 3
    tries ||= 0
    response = wiki_who_server.get(url_query)
    response
  rescue StandardError => e
    status = e.response && e.response[:status]

    # Don't retry if missing revision
    if status != 400
      tries += 1
      unless Rails.env.test?
        sleep_time = 3**tries
        puts "WikiWhoApi / Error – Retrying after #{sleep_time} seconds (#{tries}/#{total_tries}) "
        sleep sleep_time
      end
      retry unless tries == total_tries
    end

    log_error(e, response, false)

    e.response.to_hashugar
  end
end
