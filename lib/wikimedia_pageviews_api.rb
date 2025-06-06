# frozen_string_literal: true

class WikimediaPageviewsApi
  include ApiErrorHandling

  attr_accessor :client

  def initialize(wiki)
    @wiki = wiki
    @base_url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews'
    @client = api_client
  end

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

    response = @client.get(url)

    return 0 unless response&.status == 200

    data = JSON.parse(response.body)
    items = data['items'] || []

    return 0 if items.empty?

    total_views = items.sum { |item| item['views'] || 0 }
    total_views.to_f / items.length
  end

  private

  def format_date(year, month, day)
    "#{year}#{month.to_s.rjust(2, '0')}#{day.to_s.rjust(2, '0')}"
  end

  def api_client
    Faraday.new do |conn|
      conn.headers['User-Agent'] = 'ImpactVisualizer/1.0 (https://impact-visualizer.toolforge.org/)'
      conn.adapter Faraday.default_adapter
      conn.options.timeout = 30
      conn.options.open_timeout = 10
    end
  end
end
