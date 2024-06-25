# frozen_string_literal: true

class WikisController < ApiController
  before_action :authenticate_topic_editor!

  def index
    @wikis = Wiki.all
  end
end
