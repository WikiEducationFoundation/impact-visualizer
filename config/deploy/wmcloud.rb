set :branch, "production"
set :linked_files, %w{config/master.key config/credentials/wmcloud.key config/sidekiq.yml}
set :default_env, { path: '$PATH:~/.nvm/versions/node/v20.15.1/bin' }
set :stage, :wmcloud
set :sidekiq_service_unit_user, :system
set :sidekiq_roles, %w{sidekiq app}

server "impact-visualizer", user: "ragesoss", roles: %w{app db web sidekiq}

# sidekiq-2.service is a second sidekiq worker provisioned manually on
# the wmcloud box (see server_config/sidekiq-2.service); capistrano-sidekiq
# only manages the primary sidekiq.service. These hooks mirror the gem's
# deploy lifecycle (quiet → stop → start) for the secondary worker so it
# picks up new code on the same cadence as the primary. raise_on_non_zero_exit
# is false so a missing unit (e.g. fresh provision) doesn't abort the deploy.
namespace :sidekiq do
  task :quiet_extra do
    on roles fetch(:sidekiq_roles) do
      execute :sudo, :systemctl, :kill, '-s', :TSTP, 'sidekiq-2.service',
              raise_on_non_zero_exit: false
    end
  end

  task :stop_extra do
    on roles fetch(:sidekiq_roles) do
      execute :sudo, :systemctl, :stop, 'sidekiq-2.service',
              raise_on_non_zero_exit: false
    end
  end

  task :start_extra do
    on roles fetch(:sidekiq_roles) do
      execute :sudo, :systemctl, :start, 'sidekiq-2.service',
              raise_on_non_zero_exit: false
    end
  end
end

after 'sidekiq:quiet', 'sidekiq:quiet_extra'
after 'sidekiq:stop',  'sidekiq:stop_extra'
after 'sidekiq:start', 'sidekiq:start_extra'
