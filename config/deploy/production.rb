set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/production.key log/production.log}
set :default_env, { path: '$PATH:~/.nvm/versions/node/v18.17.1/bin' }
set :stage, :production

set :sidekiq_service_unit_user, :system
set :sidekiq_roles, %w{sidekiq}
set :sidekiq_processes, 1
set :sidekiq_concurrency, 1

set :console_role, :app
# set :console_role, :sidekiq

server "172.232.172.116", user: "deploy", roles: %w{app db web}
server "172.234.250.245", user: "deploy", roles: %w{sidekiq}
