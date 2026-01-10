# frozen_string_literal: true

class PagesController < ApplicationController
  def index
    @js_params = {
      signed_in: topic_editor_signed_in? || admin_user_signed_in?,
      username: current_topic_editor&.username || current_admin_user&.email,
      is_admin: admin_user_signed_in?
    }
  end
end
