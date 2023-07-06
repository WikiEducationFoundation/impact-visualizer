# frozen_string_literal: true

FactoryBot.define do
  factory :article_timepoint do
  end
end

# == Schema Information
#
# Table name: article_timepoints
#
#  id                   :integer          not null, primary key
#  article_length       :integer
#  revisions_count      :integer
#  timestamp            :date
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  article_id           :integer          not null
#  previous_revision_id :integer
#  revision_id          :integer
#
# Indexes
#
#  index_article_timepoints_on_article_id  (article_id)
#
# Foreign Keys
#
#  article_id  (article_id => articles.id)
#
