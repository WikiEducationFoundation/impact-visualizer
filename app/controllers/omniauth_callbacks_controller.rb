# frozen_string_literal: true

class OmniauthCallbacksController < Devise::OmniauthCallbacksController
  skip_before_action :verify_authenticity_token, only: :mediawiki

  def mediawiki
    @topic_editor = TopicEditor.from_omniauth(request.env['omniauth.auth'])
    if @topic_editor.persisted?
      sign_out(:admin_user) if admin_user_signed_in?
      sign_in_and_redirect(@topic_editor)
    end
  end
end
