set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/production.key}
set :default_env, { path: '$PATH:~/.nvm/versions/node/v18.17.1/bin' }
set :stage, :production
server "172.232.172.116", user: "deploy", roles: %w{app db web}
