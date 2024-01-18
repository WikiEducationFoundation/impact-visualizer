Rails.application.routes.draw do
  devise_for :admin_users, ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)
  
  scope '/api' do
    resources :topics, only: [:index, :show] do
      resources :topic_timepoints, only: [:index]
    end
  end

  get '/topics/:slug', to: 'pages#index'
  root "pages#index"
end
