# config valid for current version and patch releases of Capistrano
lock "~> 3.17.3"

set :application, "impact-visualizer"
set :repo_url, "git@github.com:WikiEducationFoundation/impact-visualizer.git"

set :deploy_to, "/var/www/impact-visualizer"

set :passenger_restart_with_touch, false
set :assets_prefix, 'vite'

append :linked_dirs, "db/csv"
append :linked_dirs, "storage"

# Default value for :linked_files is []
# append :linked_files, "config/database.yml", 'config/master.key'

# Default value for linked_dirs is []
# append :linked_dirs, "log", "tmp/pids", "tmp/cache", "tmp/sockets", "tmp/webpacker", "public/system", "vendor", "storage"

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for local_user is ENV['USER']
# set :local_user, -> { `git config user.name`.chomp }

# Default value for keep_releases is 5
# set :keep_releases, 5

# Uncomment the following to require manually verifying the host key before first deploy.
# set :ssh_options, verify_host_key: :secure