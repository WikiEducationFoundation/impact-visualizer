# frozen_string_literal: true

module Admin
  class SessionsController < ActiveAdmin::Devise::SessionsController
    def create
      sign_out(:topic_editor) if topic_editor_signed_in?
      super
    end
  end
end
