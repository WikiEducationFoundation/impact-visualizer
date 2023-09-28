set :branch, "production"
server "172.232.172.116", user: "deploy", roles: %w{app db web}
