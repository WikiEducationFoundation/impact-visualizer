# frozen_string_literal: true

class Features
  def self.user_agent
    ENV['VISUALIZER_USER_AGENT']
  end

  def self.tools_base_url
    ENV['IMPACT_VISUALIZER_TOOLS_URL'].presence || 'https://impact-visualizer-tools.wmcloud.org'
  end

  def self.http_timeout_seconds
    ENV['HTTP_TIMEOUT_SECONDS'].presence&.to_i || 30
  end

  def self.http_open_timeout_seconds
    ENV['HTTP_OPEN_TIMEOUT_SECONDS'].presence&.to_i || 10
  end
end
