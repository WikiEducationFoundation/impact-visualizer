# frozen_string_literal: true

class WikimediaPageviewsApi
  include ApiErrorHandling

  attr_accessor :client

  def initialize(wiki)
    @wiki = wiki
    @base_url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews'
    @client = api_client
  end

  # Default backoff when the server doesn't send a Retry-After header.
  # Per Wikimedia's rate-limits policy, ≥5s is the floor expected of
  # well-behaved clients.
  DEFAULT_RETRY_AFTER_SECONDS = 5
  MAX_RETRY_AFTER_SECONDS = 60
  MAX_TRIES = 5

  def get_average_daily_views(
    article:,
    start_year: Date.current.year,
    end_year: Date.current.year,
    start_month: 1,
    start_day: 1,
    end_month: 12,
    end_day: 31
  )
    start_date = format_date(start_year, start_month, start_day)
    end_date = format_date(end_year, end_month, end_day)

    project = @wiki.domain
    encoded_article = CGI.escape(article)

    url = "#{@base_url}/per-article/#{project}/all-access/all-agents/#{encoded_article}/daily/#{start_date}/#{end_date}"

    response = pageviews_get(url)

    return 0 unless response&.status == 200

    data = JSON.parse(response.body)
    items = data['items'] || []

    return 0 if items.empty?

    total_views = items.sum { |item| item['views'] || 0 }
    total_views.to_f / items.length
  end

  private

  # The pageviews endpoint isn't behind Faraday's `:raise_error`
  # middleware, so a 429 comes back as a regular response with
  # status 429. Without this loop the caller silently treats 429
  # like "no data" and returns 0 — masking the throttle and
  # producing wrong analytics. Honor Retry-After (clamped to a
  # 5–60 s window) and retry up to MAX_TRIES times.
  def pageviews_get(url)
    tries = 0
    loop do
      tries += 1
      response = @client.get(url)
      return response unless response&.status == 429
      return response if tries >= MAX_TRIES

      retry_after = response.headers && response.headers['Retry-After']
      wait_seconds = retry_after.to_i if retry_after
      wait_seconds = [wait_seconds || 0, DEFAULT_RETRY_AFTER_SECONDS].max
      wait_seconds = [wait_seconds, MAX_RETRY_AFTER_SECONDS].min
      # 0–3 s of jitter to de-correlate the retry herd; see
      # wiki_action_api.rb for the full rationale.
      wait_seconds += rand(0.0..3.0)
      unless Rails.env.test?
        Rails.logger.warn(
          "WikimediaPageviewsApi / 429 Too Many Requests - " \
          "waiting #{wait_seconds.round(2)}s (attempt #{tries}/#{MAX_TRIES})"
        )
      end
      sleep wait_seconds
    end
  end


  def format_date(year, month, day)
    "#{year}#{month.to_s.rjust(2, '0')}#{day.to_s.rjust(2, '0')}"
  end

  def api_client
    Faraday.new do |conn|
      conn.headers['User-Agent'] = Features.user_agent
      conn.adapter Faraday.default_adapter
      conn.options.timeout = Features.http_timeout_seconds
      conn.options.open_timeout = Features.http_open_timeout_seconds
    end
  end
end
