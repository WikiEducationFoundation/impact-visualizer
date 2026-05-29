# frozen_string_literal: true

# Gets token attribution from WikiWho
# https://wikiwho-api.wmcloud.org/en/api/v1.0.0-beta/
class WikiWhoApi
  include ApiErrorHandling

  WIKI_WHO_SERVER_URL = 'https://wikiwho-api.wmcloud.org/'
  WIKI_WHO_API_PATH = '/api/v1.0.0-beta/'

  # Languages supported by https://wikiwho-api.wmcloud.org/
  # Keep in sync with scripts/words_per_token/sample.py::SUPPORTED_LANGS.
  # Notes: `no` and `nb` are listed on the WikiWho homepage but the API
  # returns 404 for them, so they're excluded. `ro` and `sh` exist on the
  # service but weren't included in the May 2026 study; add when sampled.
  AVAILABLE_WIKIPEDIAS = %w[
    ar ce cs de dsb en es eu fa fi fr hi hu id it ja nl pl pt
    ru sr sv tr uk vi zh
  ].freeze

  def self.valid_wiki_language?(wiki)
    AVAILABLE_WIKIPEDIAS.include?(wiki.language)
  end

  def initialize(wiki:)
    raise InvalidLanguageError unless WikiWhoApi.valid_wiki_language?(wiki)
    @wiki = wiki
  end

  def get_revision_tokens(revision_id)
    response = make_request(query_url(revision_id))

    return parse_revision_tokens(response.body, revision_id) if response&.status == 200

    # Some revisions break the WikiWho API, possibly related to text-suppressed revisions
    # where the content is not available but the existence revision itself remains in the history.
    # Those will be a 500 error. For example: http://wikiwho-api.wmcloud.org/en/api/v1.0.0-beta/rev_content/rev_id/1284698874/?o_rev_id=true&editor=true&token_id=true&out=true&in=true
    # Work around it by treating it the same way as a 400 or 408.
    return nil if response&.status == 400 || response&.status == 408 || response&.status == 500

    raise RevisionTokenError, "status: #{response&.status || 'nil'} / revision_id: #{revision_id}"
  end

  class InvalidLanguageError < StandardError
  end

  class RevisionTokenError < StandardError
  end

  private

  def parse_revision_tokens(body, revision_id)
    tokens = Oj.load(body).dig('revisions', 0, revision_id.to_s, 'tokens')
    return nil unless tokens

    # Project each token down to just the fields downstream code reads:
    # o_rev_id (revision-range filtering) and editor (attribution). The
    # unused `str` field carries the article's full text and dominates the
    # payload, so dropping it — along with the Hashugar wrapping — keeps
    # memory bounded: token sets for large articles are retained across the
    # entire per-timestamp loop and fetched by ~10 threads at once.
    # See TimepointService#update_token_stats / ArticleTokenService.
    tokens.map { |token| { 'o_rev_id' => token['o_rev_id'], 'editor' => token['editor'] } }
  end

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
    conn.headers['User-Agent'] = Features.user_agent
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
    if status != 400 && status != 408
      tries += 1
      if tries < total_tries
        unless Rails.env.test?
          sleep_time = 3**tries
          puts "WikiWhoApi / Error – Retrying after #{sleep_time} seconds (#{tries}/#{total_tries}) "
          sleep sleep_time
        end
        retry
      end
    end

    log_error(e, response, false)

    e.response.to_hashugar
  end
end
