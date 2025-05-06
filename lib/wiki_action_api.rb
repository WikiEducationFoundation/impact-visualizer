# frozen_string_literal: true

class WikiActionApi
  include ApiErrorHandling

  attr_accessor :client

  def initialize(wiki)
    @api_url = wiki.action_api_url
    @client = api_client
    @wiki = wiki
    @wikidata_client = wikidata_api_client
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

  def get_page_info(pageid: nil, title: nil)
    # Setup basic query parameters
    query_parameters = {
      prop: 'info',
      redirects: true,
      formatversion: '2'
    }

    query_parameters['pageids'] = [pageid] if pageid
    query_parameters['titles'] = [title] if title

    # Fetch it
    response = query(query_parameters:)

    # If succesful, return just the page info
    response.data.dig('pages', 0).to_hashugar if response&.status == 200
  end

  def get_user_info(userid: nil, name: nil)
    # Setup basic query parameters
    query_parameters = {
      list: 'users',
      formatversion: '2'
    }

    query_parameters['ususerids'] = [userid] if userid
    query_parameters['ususers'] = [name] if name

    # Fetch it
    response = query(query_parameters:)

    # If succesful, return just the page info
    response.data.dig('users', 0).to_hashugar if response&.status == 200
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
    data.dig('pages', 0, 'revisions').to_hashugar
  end

  def get_all_revisions_in_range(pageid:, start_timestamp:, end_timestamp:)
    # Setup basic query parameters
    query_parameters = {
      pageids: [pageid],
      prop: 'revisions',
      rvprop: %w[size user userid timestamp ids],
      rvlimit: 500,
      redirects: true,
      rvstart: start_timestamp&.beginning_of_day&.iso8601,
      rvend: end_timestamp&.end_of_day&.iso8601,
      rvdir: 'newer',
      formatversion: '2'
    }

    # Fetch all revisions
    data = fetch_all(query_parameters:)

    # Return just the revisions
    data.dig('pages', 0, 'revisions').to_hashugar
  end

  def get_page_revision_at_timestamp(pageid: nil, timestamp:)
    # Setup basic query parameters
    query_parameters = {
      prop: 'revisions',
      rvprop: %w[size user userid timestamp ids slotsha1],
      rvlimit: 1,
      rvstart: timestamp&.beginning_of_day&.iso8601,
      rvdir: 'older',
      redirects: true,
      formatversion: '2'
    }

    query_parameters[:pageids] = [pageid] if pageid

    # Fetch revision
    response = query(query_parameters:)

    # Return just the revisions
    response.data.dig('pages', 0, 'revisions', 0).to_hashugar if response&.status == 200
  end

  def get_revision_at_timestamp(timestamp:)
    # Setup basic query parameters
    query_parameters = {
      list: 'allrevisions',
      arvprop: %w[size user userid timestamp ids],
      arvlimit: 1,
      arvstart: timestamp&.beginning_of_day&.iso8601,
      rvdir: 'older',
      redirects: true,
      formatversion: '2'
    }

    # Fetch revision
    response = query(query_parameters:)

    # Return just the revisions
    response.data.dig('allrevisions', 0, 'revisions', 0).to_hashugar if response&.status == 200
  end

  def get_first_revision(pageid:)
    # Setup basic query parameters
    query_parameters = {
      pageids: [pageid],
      prop: 'revisions',
      rvprop: %w[size user userid timestamp ids],
      rvlimit: 1,
      rvdir: 'newer',
      redirects: true,
      formatversion: '2'
    }

    # Fetch revision
    response = query(query_parameters:)

    # Return just the revisions
    response.data.dig('pages', 0, 'revisions', 0).to_hashugar if response&.status == 200
  end

  def get_wikidata_claims(title)
    query_parameters = {
      sites: @wiki.wikidata_site || 'enwiki',
      titles: [title]
    }

    # Fetch wikidata
    response = mediawiki(:action, query_parameters, true)

    # Return just the claims of first (& only) entity
    entity_id = response.data.dig('entities').keys[0]
    response.data.dig('entities', entity_id, 'claims') if response&.status == 200
  end

  def get_wikidata_labels(ids)
    ids_param = ids.uniq.take(50).join('|')

    query_parameters = {
      languages: @wiki.language,
      sites: @wiki.wikidata_site || 'enwiki',
      ids: ids_param,
      props: 'labels',
      token_type: false
    }

    # Fetch wikidata
    response = mediawiki(:action, query_parameters, true)

    response.data.dig('entities') if response&.status == 200
  end

  private

  def api_client
    MediawikiApi::Client.new @api_url
  end

  def wikidata_api_client
    MediawikiApi::Client.new 'https://www.wikidata.org/w/api.php'
  end

  def mediawiki(action, query, wikidata = false)
    total_tries = 3
    tries ||= 0
    if wikidata
      @wikidata_client.action :wbgetentities, query
    else
      @client.send(action, query)
    end
  rescue StandardError => e
    tries += 1
    unless Rails.env.test?
      sleep_time = 3**tries
      puts '---'
      puts "WikiActionApi / Error – Retrying after #{sleep_time} seconds (#{tries}/#{total_tries})"
      puts "WikiActionApi / Error – query: #{query}"
      puts e
      puts '---'
      sleep sleep_time
    end
    retry unless tries == total_tries
    log_error(e)
  end

  def too_many_requests?(e)
    return false unless e.instance_of?(MediawikiApi::HttpError)
    e.status == 429
  end
end
