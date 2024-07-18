# frozen_string_literal: true

class ApiController < ActionController::API
  include ActionController::Caching

  def authenticate_topic_editor!
    if topic_editor_signed_in?
      @topic_editor = current_topic_editor
    else
      head :unauthorized
    end
  end
end
