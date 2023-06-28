# frozen_string_literal: true

class WikiApi
  include ApiErrorHandling

  attr_accessor :client

  def initialize(wiki = nil)
    wiki ||= Wiki.default_wiki
    @api_url = wiki.api_url
    @client = api_client
  end

  def query(query_parameters:)
    mediawiki('query', query_parameters)
  end

  def fetch_all(query_parameters:)
    data = {}
    query = query_parameters
    continue = nil
    until continue == 'done'
      # Merge 'continue' value into initial query params
      query.merge! continue unless continue.nil?

      # Execute the new query
      response = query(query_parameters:)

      # Fall back gracefully if the query fails
      return data unless response

      # Merge the resonse data with previous payloads
      data.deep_merge! response.data

      # The 'continue' value is nil if the batch is complete
      continue = response['continue'] || 'done'
    end

    data
  end

  def get_page_info(pageid:)
    # Setup basic query parameters
    query_parameters = {
      pageids: [pageid],
      prop: 'info',
      redirects: true,
      formatversion: '2'
    }

    # Fetch it
    response = query(query_parameters:)

    # If succesful, return just the page info
    response.data.dig('pages', 0) if response&.status == 200
  end

  def get_all_revisions(pageid:)
    # Setup basic query parameters
    query_parameters = {
      pageids: [pageid],
      prop: 'revisions',
      rvprop: %w[size user userid timestamp ids],
      rvlimit: 500,
      redirects: true,
      formatversion: '2'
    }

    # Fetch all revisions
    data = fetch_all(query_parameters:)

    # Return just the revisions
    data.dig('pages', 0, 'revisions')
  end

  def get_revision_at_timestamp(pageid:, timestamp:)
    # Setup basic query parameters
    query_parameters = {
      pageids: [pageid],
      prop: 'revisions',
      rvprop: %w[size user userid timestamp ids],
      rvlimit: 1,
      rvstart: timestamp&.beginning_of_day&.iso8601,
      rvdir: 'older',
      redirects: true,
      formatversion: '2'
    }

    # Fetch revision
    response = query(query_parameters:)

    # Return just the revisions
    response.data.dig('pages', 0, 'revisions', 0) if response&.status == 200
  end

  private

  def api_client
    MediawikiApi::Client.new @api_url
  end

  def mediawiki(action, query)
    tries ||= 3
    @client.send(action, query)
  rescue StandardError => e
    tries -= 1
    # Continue for typical errors so that the request can be retried, but wait
    # a short bit in the case of 429 — too many request — errors.
    sleep 1 if too_many_requests?(e)
    retry unless tries.zero?
    log_error(e)
    return nil
  end

  def too_many_requests?(e)
    return false unless e.instance_of?(MediawikiApi::HttpError)
    e.status == 429
  end
end
