# frozen_string_literal: true

# Handles the Topic Builder → Impact Visualizer handoff flow.
# GET  /imports/:handle  renders a preview from the TB package.
# POST /imports/:handle  creates the Topic + ArticleBag in a transaction.
#
# v1 is admin-only on POST (matches the rest of IV's import surface area,
# which lives behind ActiveAdmin). The GET preview is also admin-only for
# v1; broaden in lockstep when POST opens up to authenticated editors.
class ImportsController < ApplicationController
  PREVIEW_ARTICLE_LIMIT = 10

  before_action :authenticate_admin_user!
  before_action :set_handle

  layout false

  def show
    @package = TopicBuilderPackageService.fetch(@handle)
    TopicBuilderPackageService.assert_supported_schema!(@package)
    @first_articles = @package.fetch('articles', []).first(PREVIEW_ARTICLE_LIMIT)
  rescue TopicBuilderPackageService::NotFound
    render :not_found, status: :not_found
  rescue TopicBuilderPackageService::SchemaVersionError => e
    @schema_version = e.schema_version
    render :schema_mismatch, status: :unprocessable_entity
  rescue TopicBuilderPackageService::NetworkError => e
    @network_error = e.message
    render :network_error, status: :bad_gateway
  end

  def create
    package = TopicBuilderPackageService.fetch(@handle)
    TopicBuilderPackageService.assert_supported_schema!(package)

    importer = TopicBuilderImportService.new(package: package, topic_editor: current_admin_user)
    topic = importer.import!

    redirect_to "/topics/#{topic.slug}",
                allow_other_host: false,
                notice: "Imported '#{topic.name}' with #{topic.articles_count} articles from Topic Builder."
  rescue TopicBuilderPackageService::NotFound
    render :not_found, status: :not_found
  rescue TopicBuilderPackageService::SchemaVersionError => e
    @schema_version = e.schema_version
    render :schema_mismatch, status: :unprocessable_entity
  rescue TopicBuilderPackageService::NetworkError => e
    @network_error = e.message
    render :network_error, status: :bad_gateway
  rescue TopicBuilderImportService::UnknownWikiError => e
    @import_error = e.message
    render :import_error, status: :unprocessable_entity
  rescue TopicBuilderImportService::ValidationError => e
    @import_error = e.message
    render :import_error, status: :unprocessable_entity
  end

  private

  def set_handle
    @handle = params[:handle].to_s
  end
end
