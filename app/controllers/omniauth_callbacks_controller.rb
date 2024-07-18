# frozen_string_literal: true

class OmniauthCallbacksController < Devise::OmniauthCallbacksController
  skip_before_action :verify_authenticity_token, only: :mediawiki

  def mediawiki
    @topic_editor = TopicEditor.from_omniauth(request.env['omniauth.auth'])
    sign_in_and_redirect(@topic_editor) if @topic_editor.persisted?
  end
end
