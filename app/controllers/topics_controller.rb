# frozen_string_literal: true

class TopicsController < ApplicationController
  def index
    @topics = Topic.all
  end

  def show
    @topic = Topic.find(params[:id])
  end
end
