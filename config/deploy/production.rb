set :branch, "production"
set :linked_files, %w{config/sidekiq.yml config/master.key config/credentials/production.key}
append :linked_dirs, "log", "tmp/cache", "tmp/pids", "tmp/storage"

set :default_env, { path: '$PATH:~/.nvm/versions/node/v18.17.1/bin' }
set :stage, :production

set :sidekiq_service_unit_user, :system
set :sidekiq_roles, %w{sidekiq app}

# set :console_role, :app
set :console_role, :sidekiq

server "172.232.172.116", user: "deploy", roles: %w{app db web}
server "172.234.250.245", user: "deploy", roles: %w{sidekiq}
