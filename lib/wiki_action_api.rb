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

  def parse(parse_parameters:)
    total_tries = 3
    tries ||= 0

    @client.action :parse, parse_parameters
  rescue StandardError => e
    tries += 1
    unless Rails.env.test?
      sleep_time = 3**tries
      puts '---'
      puts "WikiActionApi / Error - Retrying after #{sleep_time} seconds (#{tries}/#{total_tries})"
      puts "WikiActionApi / Error - query: #{parse_parameters}"
      puts e
      puts '---'
      sleep sleep_time
    end
    retry unless tries == total_tries
    log_error(e)
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

  def get_page_protections(pageid: nil, title: nil)
    query_parameters = {
      prop: 'info',
      inprop: 'protection',
      redirects: true,
      formatversion: '2'
    }

    if pageid
      query_parameters['pageids'] = [pageid]
    elsif title
      query_parameters['titles'] = [title]
    else
      return []
    end

    response = query(query_parameters:)
    page = response&.data&.dig('pages', 0)
    return [] unless response&.status == 200 && page

    protection = page['protection']
    protection.is_a?(Array) ? protection : []
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

  def get_unique_editors_count(pageid:)
    require 'set'

    editors = Set.new

    revisions = get_all_revisions(pageid:) || []
    revisions.each do |rev|
      userid = (rev['userid']).to_i
      if userid.positive?
        editors.add("id:#{userid}")
      else
        user = rev['user']
        editors.add("user:#{user}") if user.present?
      end
    end

    editors.size
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

  def get_lead_section_wikitext(pageid: nil, title: nil, revision_id: nil)
    query_parameters = {
      prop: 'revisions',
      rvprop: ['content'],
      formatversion: '2',
      rvsection: 0
    }

    query_parameters[:pageids] = [pageid] if pageid
    query_parameters[:titles] = [title] if title && !pageid
    query_parameters[:rvstartid] = revision_id if revision_id
    query_parameters[:rvendid] = revision_id if revision_id

    response = query(query_parameters:)

    response.data.dig('pages', 0, 'revisions', 0, 'content') if response&.status == 200
  end

  def get_page_assessments(pageid: nil, title: nil)
    query_parameters = {
      prop: 'pageassessments',
      redirects: true,
      palimit: 'max',
      formatversion: '2'
    }

    query_parameters['pageids'] = [pageid] if pageid
    query_parameters['titles'] = [title] if title

    response = query(query_parameters:)

    return nil unless response&.status == 200

    response.data.dig('pages', 0, 'pageassessments')
  end

  def get_langlinks(titles:)
    query_parameters = {
      titles:,
      prop: 'langlinks',
      lllimit: 'max',
      redirects: true,
      formatversion: '2'
    }

    Rails.logger.info("[WikiActionApi#get_langlinks] Request: #{titles.size} titles to #{@api_url} — #{titles.first(5).inspect}#{if titles.size > 5
                                                                                                                                   '...'
                                                                                                                                 end}")

    result = {}
    continue_params = nil
    iteration = 0

    loop do
      iteration += 1
      params = query_parameters.dup
      params.merge!(continue_params) if continue_params

      response = query(query_parameters: params)
      break unless response

      pages = response.data['pages'] || []
      Rails.logger.info("[WikiActionApi#get_langlinks] Continuation ##{iteration}: #{pages.count do |p|
                                                                                       p['langlinks']
                                                                                     end} pages with langlinks")

      pages.each do |page|
        next if page['missing']
        title = page['title']
        langs = (page['langlinks'] || []).map { |ll| ll['lang'] }
        result[title] = if result.key?(title)
                          (result[title] + langs).uniq
                        else
                          langs
                        end
      end

      continue_params = response['continue']
      break unless continue_params
    end

    Rails.logger.info("[WikiActionApi#get_langlinks] Parsed result after #{iteration} API calls (#{result.size} articles): #{result.inspect}")
    result
  end

  def get_langlinks_with_titles(title:)
    query_parameters = {
      titles: [title],
      prop: 'langlinks',
      lllimit: 'max',
      redirects: true,
      formatversion: '2'
    }

    result = {}
    continue_params = nil

    loop do
      params = query_parameters.dup
      params.merge!(continue_params) if continue_params

      response = query(query_parameters: params)
      break unless response

      page = response.data.dig('pages', 0)
      break unless page && !page['missing']

      (page['langlinks'] || []).each do |ll|
        result[ll['lang']] = ll['title']
      end

      continue_params = response['continue']
      break unless continue_params
    end

    result
  end

  def get_langlinks_count(title:)
    query_parameters = {
      titles: [title],
      prop: 'langlinks',
      lllimit: 'max',
      redirects: true,
      formatversion: '2'
    }

    data = fetch_all(query_parameters:)
    page = data.dig('pages', 0)
    return 0 unless page
    return 0 if page['missing']

    langlinks = page['langlinks'] || []
    langlinks.is_a?(Array) ? langlinks.length : 0
  end

  def get_images_count(title:)
    query_parameters = {
      titles: [title],
      prop: 'images',
      imlimit: 'max',
      redirects: true,
      formatversion: '2'
    }

    data = fetch_all(query_parameters:)
    page = data.dig('pages', 0)
    return 0 unless page
    return 0 if page['missing']

    images = page['images'] || []
    images.is_a?(Array) ? images.length : 0
  end

  def get_backlinks_count(title:)
    count = 0
    query_parameters = {
      list: 'backlinks',
      bltitle: title,
      bllimit: 'max',
      blnamespace: 0,
      redirects: true,
      formatversion: '2'
    }

    loop do
      response = query(query_parameters:)
      break unless response&.status == 200

      backlinks = response.data['backlinks'] || []
      count += backlinks.length

      continue_token = response['continue']&.dig('blcontinue')
      break unless continue_token

      query_parameters = query_parameters.merge('blcontinue' => continue_token)
    end

    count
  rescue StandardError => e
    Rails.logger.error("[WikiActionApi] Error fetching backlinks count for #{title}: #{e.message}")
    0
  end

  def get_templates(title:, namespace: 10)
    query_parameters = {
      titles: [title],
      prop: 'templates',
      tllimit: 'max',
      redirects: true,
      formatversion: '2'
    }
    query_parameters[:tlnamespace] = namespace if namespace

    data = fetch_all(query_parameters:)
    page = data.dig('pages', 0)
    return [] unless page
    return [] if page['missing']

    templates = page['templates'] || []
    templates.is_a?(Array) ? templates : []
  end

  def get_lead_html(title:)
    parse_parameters = {
      page: title,
      prop: 'text',
      section: 0,
      redirects: true,
      formatversion: '2'
    }

    response = parse(parse_parameters:)
    return nil unless response&.status == 200

    text = response.data.dig('parse', 'text')
    return text if text.is_a?(String)
    return text['*'] if text.is_a?(Hash) && text['*'].is_a?(String)

    nil
  end

  private

  # MediawikiApi::Client 0.9.0 stores its Faraday connection as `@conn`
  # and does not expose a public `connection` accessor — the previous
  # `client.respond_to?(:connection)` check silently returned false, so
  # outbound requests went out with `User-Agent: Faraday v#.#.#`,
  # filing us in Wikimedia's "unidentified" tier (10 req/min) instead
  # of the compliant tier (200 req/min). Set the UA via the private
  # ivar until the gem exposes a public accessor.
  def set_user_agent(client)
    conn = client.instance_variable_get(:@conn)
    conn.headers[:user_agent] = Features.user_agent if conn
    client
  end

  # Wikimedia OAuth 2 owner-only consumer token (scopes: basic +
  # highvolume). With this set, requests count against the
  # consumer's per-account quota (150k req/hr at time of writing) and
  # get apihighlimits-equivalent paging — vs anonymous's per-IP
  # bucket that throttles to ~5k req/hr. No-op when the credential
  # isn't set (e.g. local dev without the credential file decrypted)
  # so requests fall back to anonymous.
  def authenticate(client)
    token = Rails.application.credentials.dig(:wiki, :token)
    client.oauth_access_token(token) if token
    client
  end

  def api_client
    authenticate(set_user_agent(MediawikiApi::Client.new(@api_url)))
  end

  def wikidata_api_client
    authenticate(set_user_agent(MediawikiApi::Client.new('https://www.wikidata.org/w/api.php')))
  end

  # Default backoff when the server doesn't send a Retry-After header.
  # Per Wikimedia's rate-limits policy, ≥5s is the floor expected of
  # well-behaved clients. The Varnish bot-throttle typically asks for
  # ~11s when it does send the header.
  DEFAULT_RETRY_AFTER_SECONDS = 5
  MAX_RETRY_AFTER_SECONDS = 60

  def mediawiki(action, query, wikidata = false)
    total_tries = 5
    tries ||= 0
    if wikidata
      @wikidata_client.action :wbgetentities, query
    else
      @client.send(action, query)
    end
  rescue StandardError => e
    tries += 1
    if !Rails.env.test? || ENV['VCR_RECORD']
      if too_many_requests?(e)
        # Faraday 2 exposes headers via a method (case-insensitive
        # CaseInsensitiveHash), not via `response[:headers]`. The
        # previous code returned nil and crashed.
        retry_after = if e.respond_to?(:response) && e.response.respond_to?(:headers)
                        e.response.headers['Retry-After']
                      end
        wait_seconds = retry_after.to_i if retry_after
        wait_seconds = [wait_seconds || 0, DEFAULT_RETRY_AFTER_SECONDS].max
        wait_seconds = [wait_seconds, MAX_RETRY_AFTER_SECONDS].min
        # 0–3 s of jitter, not 0–0.5: under high concurrency (analytics
        # is now multi-threaded) all retrying threads tend to wake up
        # near the same Retry-After deadline. With 0–0.5 s jitter on a
        # 5–30 s wait they re-burst as a near-synchronous herd; 0–3 s
        # is enough to spread the wave across a few seconds.
        wait_seconds += rand(0.0..3.0)
        puts "WikiActionApi / 429 Too Many Requests - waiting #{wait_seconds.round(2)}s (attempt #{tries}/#{total_tries})"
        sleep wait_seconds
      else
        sleep_time = 3**tries
        puts '---'
        puts "WikiActionApi / Error – Retrying after #{sleep_time} seconds (#{tries}/#{total_tries})"
        puts "WikiActionApi / Error – query: #{query}"
        puts e
        puts '---'
        sleep sleep_time
      end
    end
    retry unless tries == total_tries
    log_error(e)
  end

  def too_many_requests?(e)
    return false unless e.instance_of?(MediawikiApi::HttpError)
    e.status == 429
  end
end
