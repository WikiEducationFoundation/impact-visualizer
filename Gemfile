source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.2.2'

gem 'activeadmin'
gem 'annotate'
gem 'benchmark', '~> 0.2.1'
gem 'connection_pool'
gem 'dalli'
gem 'devise'
gem 'rails', '~> 7.0.5'
gem 'sqlite3', '~> 1.4'
gem 'puma', '~> 5.0'
gem 'pg'
gem 'jbuilder'
gem 'tzinfo-data', platforms: %i[ mingw mswin x64_mingw jruby ]
gem 'bootsnap', require: false
gem 'awesome_print'
gem 'mediawiki_api'
gem 'hashugar'
gem 'oauth2'
gem 'oj'
gem 'omniauth-mediawiki', git: 'https://github.com/ragesoss/omniauth-mediawiki.git'
gem 'omniauth-rails_csrf_protection'
gem 'parallel', "~> 1.23"
gem 'rexml'
gem 'sass-rails'
gem 'sidekiq'
gem 'sidekiq-history'
gem 'sidekiq-status'
gem 'sprockets', '<4'
gem 'vite_rails'

group :development do
  gem "capistrano", "~> 3.10", require: false
  gem "capistrano-rails", "~> 1.3", require: false
  gem 'capistrano-rvm', require: false
  gem 'capistrano-passenger', '0.2.0', require: false
  gem 'capistrano-rails-console', require: false
  gem 'capistrano-rake', require: false
  gem 'capistrano-sidekiq', require: false
  gem 'spring'
end

group :development, :test do
  gem 'debug', platforms: %i[ mri mingw x64_mingw ]
  gem 'rspec-rails', '~> 6.0.0'
  gem 'factory_bot_rails'
  gem 'spring-commands-rspec'
  gem 'faker'
  gem 'rubocop',  require: false
  gem 'rubocop-rails', require: false
  gem 'rubocop-rspec', require: false
  gem 'rubocop-performance', require: false
  gem 'timecop', '~> 0.9.6'
end

group :test do
  gem 'rspec-sidekiq'
  gem 'shoulda-matchers', '~> 5.0'
  gem 'vcr'
  gem 'webmock'
end
