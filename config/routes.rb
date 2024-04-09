# frozen_string_literal: true

require 'sidekiq/web'
require 'sidekiq-status/web'

Rails.application.routes.draw do
  devise_for :admin_users, ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)
  
  authenticate :admin_user, lambda { |u| u.present? } do
    mount Sidekiq::Web => '/admin/sidekiq'
  end
  
  scope '/api' do
    resources :topics, only: [:index, :show] do
      resources :topic_timepoints, only: [:index]
    end
  end

  get '/topics/:slug', to: 'pages#index'
  get '/search/wikidata-tool', to: 'pages#index'
  get '/search/wikipedia-category-tool', to: 'pages#index'

  root "pages#index"
end
