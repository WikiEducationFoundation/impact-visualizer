require 'vcr'

VCR.configure do |config|
  config.cassette_library_dir = "spec/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.ignore_localhost = true
  config.ignore_hosts '127.0.0.1'
  config.configure_rspec_metadata!
  config.allow_http_connections_when_no_cassette = true
  config.ignore_localhost = true
  config.default_cassette_options = { allow_playback_repeats: true }
end

RSpec.configure do |c|
  c.around(:each, :vcr) do |example|
    name = example.metadata[:full_description].split(/\s+/, 2).join('/').underscore.gsub(/[^\w\/]+/, '_')
    options = example.metadata.slice(:record, :match_requests_on, :tag).except(:example_group)
    VCR.use_cassette(name, options) { example.call }
  end
end
