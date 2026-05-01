require 'vcr'

VCR.configure do |config|
  config.cassette_library_dir = "spec/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.ignore_localhost = true
  config.ignore_hosts '127.0.0.1'
  config.configure_rspec_metadata!
  config.allow_http_connections_when_no_cassette = false
  record_mode = ENV['VCR_RECORD']&.to_sym || :once
  config.default_cassette_options = { allow_playback_repeats: true, record: record_mode }

  # Strip any Bearer token from outbound requests so cassettes never
  # commit real credentials. Originally added for the Lift Wing JWT,
  # now also redacts the Wikimedia OAuth 2 token (Rails creds
  # wiki.token) used on Action API and REST API requests.
  config.filter_sensitive_data('<BEARER_TOKEN>') do |interaction|
    interaction.request.headers['Authorization']&.first&.[](/Bearer (\S+)/, 1)
  end

  # Strip the X-Client-Ip that Wikimedia echoes back; otherwise the recorder's
  # public IP ends up in the cassette.
  config.filter_sensitive_data('<CLIENT_IP>') do |interaction|
    interaction.response.headers['X-Client-Ip']&.first
  end
end

RSpec.configure do |c|
  c.around(:each, :vcr) do |example|
    name = example.metadata[:full_description].split(/\s+/, 2).join('/').underscore.gsub(/[^\w\/]+/, '_')
    options = example.metadata.slice(:record, :match_requests_on, :tag).except(:example_group)
    VCR.use_cassette(name, options) { example.call }
  end
end
