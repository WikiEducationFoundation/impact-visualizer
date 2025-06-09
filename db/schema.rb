# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2025_06_09_192907) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_admin_comments", force: :cascade do |t|
    t.string "namespace"
    t.text "body"
    t.string "resource_type"
    t.bigint "resource_id"
    t.string "author_type"
    t.bigint "author_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_type", "author_id"], name: "index_active_admin_comments_on_author"
    t.index ["namespace"], name: "index_active_admin_comments_on_namespace"
    t.index ["resource_type", "resource_id"], name: "index_active_admin_comments_on_resource"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "admin_users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_admin_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_admin_users_on_reset_password_token", unique: true
  end

  create_table "article_bag_articles", force: :cascade do |t|
    t.bigint "article_bag_id", null: false
    t.bigint "article_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_bag_id"], name: "index_article_bag_articles_on_article_bag_id"
    t.index ["article_id"], name: "index_article_bag_articles_on_article_id"
  end

  create_table "article_bags", force: :cascade do |t|
    t.string "name"
    t.bigint "topic_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id"], name: "index_article_bags_on_topic_id"
  end

  create_table "article_classifications", force: :cascade do |t|
    t.bigint "classification_id", null: false
    t.bigint "article_id", null: false
    t.jsonb "properties"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_id"], name: "index_article_classifications_on_article_id"
    t.index ["classification_id"], name: "index_article_classifications_on_classification_id"
  end

  create_table "article_timepoints", force: :cascade do |t|
    t.integer "revision_id"
    t.integer "article_length"
    t.integer "revisions_count"
    t.date "timestamp"
    t.bigint "article_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.float "wp10_prediction"
    t.integer "token_count"
    t.string "wp10_prediction_category"
    t.index ["article_id"], name: "index_article_timepoints_on_article_id"
  end

  create_table "articles", force: :cascade do |t|
    t.string "title"
    t.integer "pageid"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "first_revision_id"
    t.string "first_revision_by_name"
    t.integer "first_revision_by_id"
    t.datetime "first_revision_at"
    t.bigint "wiki_id", null: false
    t.boolean "missing", default: false
    t.index ["wiki_id"], name: "index_articles_on_wiki_id"
  end

  create_table "classifications", force: :cascade do |t|
    t.string "name"
    t.jsonb "prerequisites"
    t.jsonb "properties"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "topic_article_analytics", force: :cascade do |t|
    t.bigint "topic_id", null: false
    t.bigint "article_id", null: false
    t.integer "average_daily_views", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id", "article_id"], name: "index_topic_article_analytics_on_topic_id_and_article_id", unique: true
  end

  create_table "topic_article_timepoints", force: :cascade do |t|
    t.integer "length_delta"
    t.integer "revisions_count_delta"
    t.integer "attributed_length_delta"
    t.integer "attributed_revisions_count_delta"
    t.datetime "attributed_creation_at"
    t.bigint "topic_timepoint_id", null: false
    t.bigint "article_timepoint_id", null: false
    t.bigint "attributed_creator_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "token_count_delta"
    t.integer "attributed_token_count"
    t.index ["article_timepoint_id"], name: "index_topic_article_timepoints_on_article_timepoint_id"
    t.index ["attributed_creator_id"], name: "index_topic_article_timepoints_on_attributed_creator_id"
    t.index ["topic_timepoint_id"], name: "index_topic_article_timepoints_on_topic_timepoint_id"
  end

  create_table "topic_classifications", force: :cascade do |t|
    t.bigint "classification_id", null: false
    t.bigint "topic_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["classification_id"], name: "index_topic_classifications_on_classification_id"
    t.index ["topic_id"], name: "index_topic_classifications_on_topic_id"
  end

  create_table "topic_editor_topics", force: :cascade do |t|
    t.bigint "topic_id", null: false
    t.bigint "topic_editor_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_editor_id"], name: "index_topic_editor_topics_on_topic_editor_id"
    t.index ["topic_id"], name: "index_topic_editor_topics_on_topic_id"
  end

  create_table "topic_editors", force: :cascade do |t|
    t.datetime "remember_created_at"
    t.string "provider"
    t.string "uid"
    t.string "username"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "topic_summaries", force: :cascade do |t|
    t.integer "articles_count"
    t.integer "articles_count_delta"
    t.integer "attributed_articles_created_delta"
    t.integer "attributed_length_delta"
    t.integer "attributed_revisions_count_delta"
    t.integer "attributed_token_count"
    t.integer "length"
    t.integer "length_delta"
    t.integer "revisions_count"
    t.integer "revisions_count_delta"
    t.integer "token_count"
    t.integer "token_count_delta"
    t.integer "timepoint_count"
    t.float "average_wp10_prediction"
    t.bigint "topic_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "wp10_prediction_categories"
    t.integer "missing_articles_count"
    t.jsonb "classifications", default: []
    t.index ["topic_id"], name: "index_topic_summaries_on_topic_id"
  end

  create_table "topic_timepoints", force: :cascade do |t|
    t.integer "length"
    t.integer "length_delta"
    t.integer "articles_count"
    t.integer "articles_count_delta"
    t.integer "revisions_count"
    t.integer "revisions_count_delta"
    t.integer "attributed_length_delta"
    t.integer "attributed_revisions_count_delta"
    t.integer "attributed_articles_created_delta"
    t.date "timestamp"
    t.bigint "topic_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.float "average_wp10_prediction"
    t.integer "token_count"
    t.integer "token_count_delta"
    t.integer "attributed_token_count"
    t.jsonb "wp10_prediction_categories"
    t.jsonb "classifications", default: []
    t.index ["topic_id"], name: "index_topic_timepoints_on_topic_id"
  end

  create_table "topic_users", force: :cascade do |t|
    t.bigint "topic_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id"], name: "index_topic_users_on_topic_id"
    t.index ["user_id"], name: "index_topic_users_on_user_id"
  end

  create_table "topics", force: :cascade do |t|
    t.string "name"
    t.string "description"
    t.string "slug"
    t.integer "timepoint_day_interval", default: 7
    t.datetime "start_date"
    t.datetime "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "wiki_id"
    t.string "editor_label", default: "participant"
    t.boolean "display", default: false
    t.string "chart_time_unit", default: "year"
    t.string "users_import_job_id"
    t.string "article_import_job_id"
    t.string "timepoint_generate_job_id"
    t.boolean "convert_tokens_to_words", default: false
    t.float "tokens_per_word", default: 3.25
    t.string "incremental_topic_build_job_id"
    t.string "generate_article_analytics_job_id"
  end

  create_table "users", force: :cascade do |t|
    t.integer "wiki_user_id"
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "wiki_id", null: false
    t.index ["wiki_id"], name: "index_users_on_wiki_id"
  end

  create_table "wikis", force: :cascade do |t|
    t.string "language", limit: 16
    t.string "project", limit: 16
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "wikidata_site"
    t.index ["language", "project"], name: "index_wikis_on_language_and_project", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "article_bag_articles", "article_bags"
  add_foreign_key "article_bag_articles", "articles"
  add_foreign_key "article_bags", "topics"
  add_foreign_key "article_classifications", "articles"
  add_foreign_key "article_classifications", "classifications"
  add_foreign_key "article_timepoints", "articles"
  add_foreign_key "articles", "wikis"
  add_foreign_key "topic_article_analytics", "articles"
  add_foreign_key "topic_article_analytics", "topics"
  add_foreign_key "topic_article_timepoints", "article_timepoints"
  add_foreign_key "topic_article_timepoints", "topic_timepoints"
  add_foreign_key "topic_article_timepoints", "users", column: "attributed_creator_id"
  add_foreign_key "topic_classifications", "classifications"
  add_foreign_key "topic_classifications", "topics"
  add_foreign_key "topic_editor_topics", "topic_editors"
  add_foreign_key "topic_editor_topics", "topics"
  add_foreign_key "topic_summaries", "topics"
  add_foreign_key "topic_timepoints", "topics"
  add_foreign_key "topic_users", "topics"
  add_foreign_key "topic_users", "users"
  add_foreign_key "users", "wikis"
end
