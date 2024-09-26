# frozen_string_literal: true

require 'sidekiq/web'
require 'sidekiq-status/web'

Rails.application.routes.draw do
  devise_for :topic_editors, controllers: { omniauth_callbacks: 'omniauth_callbacks' }

  devise_scope :topic_editor do
    get 'logout', to: 'devise/sessions#destroy'
  end

  devise_for :admin_users, ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)
  
  authenticate :admin_user, lambda { |u| u.present? } do
    mount Sidekiq::Web => '/admin/sidekiq'
  end
  
  scope '/api' do
    resources :wikis, only: [:index]
    resources :topics, only: [:index, :show, :create, :update, :destroy] do
      get :import_users, on: :member
      get :import_articles, on: :member
      get :generate_timepoints, on: :member
      resources :topic_timepoints, only: [:index]
    end
  end

  get '/topics/:slug', to: 'pages#index'
  get '/my-topics', to: 'pages#index'
  get '/my-topics/new', to: 'pages#index'
  get '/my-topics/edit/:slug', to: 'pages#index'
  get '/search/wikidata-tool', to: 'pages#index'
  get '/search/wikipedia-category-tool', to: 'pages#index'
  get '/search/wiki-dashboard-tool', to: 'pages#index'

  root "pages#index"
end
