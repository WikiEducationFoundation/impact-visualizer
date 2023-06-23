source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.2.2'

gem 'rails', '~> 7.0.5'
gem 'sqlite3', '~> 1.4'
gem 'puma', '~> 5.0'
gem 'jbuilder'
gem 'tzinfo-data', platforms: %i[ mingw mswin x64_mingw jruby ]
gem 'bootsnap', require: false
gem 'awesome_print'
gem 'mediawiki_api'
gem 'oj'

group :development do
  gem 'spring'
  gem 'annotate'
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
end

group :test do
  gem 'shoulda-matchers', '~> 5.0'
  gem 'vcr'
  gem 'webmock'
end
