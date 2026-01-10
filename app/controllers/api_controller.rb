# frozen_string_literal: true

class ApiController < ActionController::API
  include ActionController::Caching

  def authenticate_topic_editor!
    if topic_editor_signed_in?
      @topic_editor = current_topic_editor
    elsif admin_user_signed_in?
      @topic_editor = current_admin_user
    else
      head :unauthorized
    end
  end

  def current_editor
    current_topic_editor || current_admin_user
  end
end
