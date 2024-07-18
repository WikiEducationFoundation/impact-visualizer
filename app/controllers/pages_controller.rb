# frozen_string_literal: true

class PagesController < ApplicationController
  def index
    @js_params = {
      signed_in: topic_editor_signed_in?,
      username: current_topic_editor&.username
    }
  end
end
