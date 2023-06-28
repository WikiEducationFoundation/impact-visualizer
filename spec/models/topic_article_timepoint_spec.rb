# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicArticleTimepoint do
  it { is_expected.to belong_to(:topic_timepoint) }
  it { is_expected.to belong_to(:article_bag_article) }
end

# == Schema Information
#
# Table name: topic_article_timepoints
#
#  id                               :integer          not null, primary key
#  attributed_creation_at           :datetime
#  attributed_length_delta          :integer
#  attributed_links_count_delta     :integer
#  attributed_revisions_count_delta :integer
#  length_delta                     :integer
#  links_count_delta                :integer
#  revisions_count_delta            :integer
#  created_at                       :datetime         not null
#  updated_at                       :datetime         not null
#  article_bag_article_id           :integer          not null
#  attributed_creator_id            :integer
#  topic_timepoint_id               :integer          not null
#
# Indexes
#
#  index_topic_article_timepoints_on_article_bag_article_id  (article_bag_article_id)
#  index_topic_article_timepoints_on_attributed_creator_id   (attributed_creator_id)
#  index_topic_article_timepoints_on_topic_timepoint_id      (topic_timepoint_id)
#
# Foreign Keys
#
#  article_bag_article_id  (article_bag_article_id => article_bag_articles.id)
#  attributed_creator_id   (attributed_creator_id => users.id)
#  topic_timepoint_id      (topic_timepoint_id => topic_timepoints.id)
#
