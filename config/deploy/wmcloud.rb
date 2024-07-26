set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/wmcloud.key}
set :default_env, { path: '$PATH:~/.nvm/versions/node/v20.15.1/bin' }
set :stage, :wmcloud
set :sidekiq_service_unit_user, :system
server "impact-visualizer", user: "mattfordham", roles: %w{app db web}
