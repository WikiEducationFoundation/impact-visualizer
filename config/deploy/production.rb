set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/production.key}
server "172.232.172.116", user: "deploy", roles: %w{app db web}
