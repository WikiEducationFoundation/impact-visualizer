host = Rails.application.credentials.dig(:redis, :host) || 'localhost'
port = Rails.application.credentials.dig(:redis, :port) || 6379
expiration =  24.hours.to_i * 30

Sidekiq.configure_client do |config|
  config.redis = { url: "redis://#{host}:#{port}/0" }  
  # Sidekiq::Status.configure_client_middleware config, expiration: expiration
end

Sidekiq.configure_server do |config|
  config.redis = { url: "redis://#{host}:#{port}/0" }
  # Sidekiq::Status.configure_server_middleware config, expiration: expiration
end

