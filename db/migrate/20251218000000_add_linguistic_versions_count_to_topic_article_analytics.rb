# frozen_string_literal: true

class AddLinguisticVersionsCountToTopicArticleAnalytics < ActiveRecord::Migration[7.0]
  def change
    return if column_exists?(:topic_article_analytics, :linguistic_versions_count)

    add_column :topic_article_analytics,
               :linguistic_versions_count,
               :integer,
               null: false,
               default: 0
  end
end


