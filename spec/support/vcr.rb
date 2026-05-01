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

  # Strip the Lift Wing JWT from any request that carries one, so cassettes
  # never commit a real bearer token.
  config.filter_sensitive_data('<LIFTWING_TOKEN>') do |interaction|
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
