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

ActiveRecord::Schema[7.0].define(version: 2023_06_16_195410) do
  create_table "article_bag_articles", force: :cascade do |t|
    t.integer "article_bag_id", null: false
    t.integer "article_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_bag_id"], name: "index_article_bag_articles_on_article_bag_id"
    t.index ["article_id"], name: "index_article_bag_articles_on_article_id"
  end

  create_table "article_bags", force: :cascade do |t|
    t.string "name"
    t.integer "topic_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id"], name: "index_article_bags_on_topic_id"
  end

  create_table "article_timepoints", force: :cascade do |t|
    t.integer "revision_id"
    t.integer "previous_revision_id"
    t.integer "article_length"
    t.integer "links_count"
    t.integer "revisions_count"
    t.integer "article_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_id"], name: "index_article_timepoints_on_article_id"
  end

  create_table "articles", force: :cascade do |t|
    t.string "title"
    t.integer "page_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "topic_article_timepoints", force: :cascade do |t|
    t.integer "length_delta"
    t.integer "links_count_delta"
    t.integer "revisions_count_delta"
    t.integer "attributed_length_delta"
    t.integer "attributed_links_count_delta"
    t.integer "attributed_revisions_count_delta"
    t.datetime "attributed_creation_at"
    t.integer "topic_timepoint_id", null: false
    t.integer "article_bag_article_id", null: false
    t.integer "attributed_creator_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_bag_article_id"], name: "index_topic_article_timepoints_on_article_bag_article_id"
    t.index ["attributed_creator_id"], name: "index_topic_article_timepoints_on_attributed_creator_id"
    t.index ["topic_timepoint_id"], name: "index_topic_article_timepoints_on_topic_timepoint_id"
  end

  create_table "topic_timepoints", force: :cascade do |t|
    t.integer "length"
    t.integer "length_delta"
    t.integer "links_count"
    t.integer "links_count_delta"
    t.integer "articles_count"
    t.integer "articles_count_delta"
    t.integer "revisions_count"
    t.integer "revisions_count_delta"
    t.integer "attributed_length_delta"
    t.integer "attributed_links_count_delta"
    t.integer "attributed_revisions_count_delta"
    t.integer "attributed_articles_created_delta"
    t.integer "topic_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id"], name: "index_topic_timepoints_on_topic_id"
  end

  create_table "topic_users", force: :cascade do |t|
    t.integer "topic_id", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id"], name: "index_topic_users_on_topic_id"
    t.index ["user_id"], name: "index_topic_users_on_user_id"
  end

  create_table "topics", force: :cascade do |t|
    t.string "name"
    t.string "description"
    t.string "slug"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.integer "wiki_user_id"
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "article_bag_articles", "article_bags"
  add_foreign_key "article_bag_articles", "articles"
  add_foreign_key "article_bags", "topics"
  add_foreign_key "article_timepoints", "articles"
  add_foreign_key "topic_article_timepoints", "article_bag_articles"
  add_foreign_key "topic_article_timepoints", "topic_timepoints"
  add_foreign_key "topic_article_timepoints", "users", column: "attributed_creator_id"
  add_foreign_key "topic_timepoints", "topics"
  add_foreign_key "topic_users", "topics"
  add_foreign_key "topic_users", "users"
end
