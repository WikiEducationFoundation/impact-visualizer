Sidekiq.configure_client do |config|
  # config.redis = { url: 'redis://redis.example.com:7372/0' }
  
  Sidekiq::Status.configure_client_middleware config, expiration: 24.hours.to_i
end

Sidekiq.configure_server do |config|
  # config.redis = { url: 'redis://redis.example.com:7372/0' }

  # accepts :expiration (optional)
  Sidekiq::Status.configure_server_middleware config, expiration: 24.hours.to_i

  # accepts :expiration (optional)
  Sidekiq::Status.configure_client_middleware config, expiration: 24.hours.to_i
end

