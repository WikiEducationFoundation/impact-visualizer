# frozen_string_literal: true

class ClassificationsController < ApiController
  before_action :authenticate_topic_editor!, only: [:index]

  def index
    @classifications = Classification.all
  end
end
