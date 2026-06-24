# frozen_string_literal: true

# Handles the Topic Builder → Impact Visualizer handoff flow.
# GET  /imports/:handle  renders a preview from the TB package.
# POST /imports/:handle  creates the Topic + ArticleBag in a transaction.
#
# When the package's source_topic_id matches an existing IV topic
# (a re-publish from TB), GET renders a sync diff preview instead of a
# create preview, and POST applies the diff via TopicBuilderSyncService.
# Sync only touches the article bag + centrality; config fields stay
# frozen at the original-import values.
#
# Open to any signed-in user (TopicEditor or AdminUser). A topic created
# from a TB package is associated with the importing TopicEditor via
# TopicBuilderImportService, which lets them manage it later; admin imports
# stay unassociated (admins can manage any topic).
#
# Sync (re-publish) is further gated by Editor#can_edit_topic? so only the
# original importer (or an admin) can re-sync an existing topic.
class ImportsController < ApplicationController
  PREVIEW_ARTICLE_LIMIT = 10

  before_action :authenticate_any_signed_in!
  before_action :set_handle

  layout false

  def show
    @package = TopicBuilderPackageService.fetch(@handle)
    TopicBuilderPackageService.assert_supported_schema!(@package)
    @existing_topic = lookup_existing_topic(@package)

    if @existing_topic
      @diff = TopicBuilderSyncService.compute_diff(topic: @existing_topic, package: @package)
      # The article diff is tag-blind; a v2 re-publish can carry tag-only
      # changes (identical article bag). Surface that so the view still
      # offers Apply when only the tag taxonomy would change.
      @tags_will_sync = TopicBuilderTagIngestService.applicable?(@package)
      @tag_count = Array(@package['tags']).size
      render :sync_preview
    else
      @first_articles = @package.fetch('articles', []).first(PREVIEW_ARTICLE_LIMIT)
    end
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
    existing_topic = lookup_existing_topic(package)

    if existing_topic
      apply_sync(existing_topic)
    else
      apply_create(package)
    end
  rescue TopicBuilderPackageService::NotFound
    render :not_found, status: :not_found
  rescue TopicBuilderPackageService::SchemaVersionError => e
    @schema_version = e.schema_version
    render :schema_mismatch, status: :unprocessable_entity
  rescue TopicBuilderPackageService::NetworkError => e
    @network_error = e.message
    render :network_error, status: :bad_gateway
  rescue TopicBuilderImportService::UnknownWikiError,
         TopicBuilderImportService::ValidationError => e
    @import_error = e.message
    render :import_error, status: :unprocessable_entity
  end

  private

  def apply_create(package)
    importer = TopicBuilderImportService.new(package:, topic_editor: current_editor)
    topic = importer.import!

    # Pre-generate the jid and write it to the topic BEFORE enqueueing,
    # so a fast worker can't finish the job (and clear the column) before
    # the controller has a chance to record the id.
    jid = SecureRandom.hex(12)
    topic.update!(article_import_job_id: jid)
    ImportTopicBuilderArticlesJob.set(jid:).perform_async(topic.id, @handle)

    article_count = package['article_count'] || package.fetch('articles', []).size
    notice = "Imported '#{topic.name}'. Ingesting #{article_count} articles in the background."
    redirect_to "/topics/#{topic.id}", notice:
  end

  def apply_sync(topic)
    unless current_editor.can_edit_topic?(topic)
      redirect_to "/topics/#{topic.id}",
                  alert: "You don't have permission to sync '#{topic.name}'."
      return
    end

    jid = SecureRandom.hex(12)
    topic.update!(article_import_job_id: jid)
    SyncTopicBuilderArticlesJob.set(jid:).perform_async(topic.id, @handle)

    redirect_to "/topics/#{topic.id}",
                notice: "Syncing '#{topic.name}' from Topic Builder in the background."
  end

  def lookup_existing_topic(package)
    source_topic_id = package['source_topic_id']
    return nil if source_topic_id.blank?
    Topic.find_by(tb_source_topic_id: source_topic_id)
  end

  def set_handle
    @handle = params[:handle].to_s
  end

  def authenticate_any_signed_in!
    return if topic_editor_signed_in? || admin_user_signed_in?
    # TopicEditor doesn't have a password-based session, only MediaWiki OAuth.
    redirect_to topic_editor_mediawiki_omniauth_authorize_path,
                alert: 'Please sign in to import a Topic Builder package.'
  end

  def current_editor
    current_topic_editor || current_admin_user
  end
end
