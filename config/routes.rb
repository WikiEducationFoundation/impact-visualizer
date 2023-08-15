Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  resources :topics, only: [:index, :show] do
    resources :topic_timepoints, only: [:index]
  end

  # Defines the root path route ("/")
  # root "articles#index"
end
