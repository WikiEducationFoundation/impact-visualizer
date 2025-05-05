set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/wmcloud.key config/sidekiq.yml}
set :default_env, { path: '$PATH:~/.nvm/versions/node/v20.15.1/bin' }
set :stage, :wmcloud
set :sidekiq_service_unit_user, :system
set :sidekiq_roles, %w{sidekiq app}

server "impact-visualizer", user: "ragesoss", roles: %w{app db web sidekiq}
