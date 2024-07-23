set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/wmcloud.key}
set :default_env, { path: '$PATH:~/.nvm/versions/node/v20.15.1/bin' }
set :stage, :wmcloud
server "impact-visualizer", user: "mattfordham", roles: %w{app db web}
