# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'

# Fetches and validates a TB→IV handoff package from topic-builder.
# Spec: docs/wikipedia-topic-builder-impact-visualizer.md (or upstream)
class TopicBuilderPackageService
  SUPPORTED_SCHEMA_VERSION = 1
  HANDLE_PREFIX = 'tbp_'
  TIMEOUT_SECONDS = 20

  class Error < StandardError; end
  class NotFound < Error; end
  class NetworkError < Error; end
  class SchemaVersionError < Error
    attr_reader :schema_version
    def initialize(schema_version)
      @schema_version = schema_version
      super("Unsupported package schema_version: #{schema_version.inspect}")
    end
  end

  def self.base_url
    ENV.fetch('TOPIC_BUILDER_BASE_URL', 'https://topic-builder.wikiedu.org')
  end

  def self.valid_handle?(handle)
    handle.is_a?(String) && handle.start_with?(HANDLE_PREFIX)
  end

  def self.fetch(handle)
    raise NotFound, 'invalid handle' unless valid_handle?(handle)

    uri = URI.join("#{base_url}/", "packages/#{handle}")
    response = http_get_with_retry(uri)

    case response
    when Net::HTTPNotFound
      raise NotFound, 'package not found or expired'
    when Net::HTTPSuccess
      JSON.parse(response.body)
    else
      raise NetworkError, "unexpected response: #{response.code} #{response.message}"
    end
  rescue JSON::ParserError => e
    raise NetworkError, "invalid JSON in package response: #{e.message}"
  rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNREFUSED => e
    raise NetworkError, "network error fetching package: #{e.message}"
  end

  # Retry once on 5xx; surface the rest.
  def self.http_get_with_retry(uri)
    response = http_get(uri)
    response = http_get(uri) if response.is_a?(Net::HTTPServerError)
    response
  end

  def self.http_get(uri)
    Net::HTTP.start(
      uri.host, uri.port,
      use_ssl: uri.scheme == 'https',
      open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS
    ) do |http|
      http.request(Net::HTTP::Get.new(uri.request_uri))
    end
  end

  def self.assert_supported_schema!(package)
    return if package['schema_version'] == SUPPORTED_SCHEMA_VERSION
    raise SchemaVersionError.new(package['schema_version'])
  end
end
