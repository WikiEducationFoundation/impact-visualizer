Sentry.init do |config|
  config.dsn = ENV['VITE_SENTRY_DSN']
end