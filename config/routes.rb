Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  scope '/api' do
    resources :topics, only: [:index, :show] do
      resources :topic_timepoints, only: [:index]
    end
  end

  get '/topics/:slug', to: 'pages#index'
  root "pages#index"
end
