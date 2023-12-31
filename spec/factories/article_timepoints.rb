# frozen_string_literal: true

FactoryBot.define do
  factory :article_timepoint do
  end
end

# == Schema Information
#
# Table name: article_timepoints
#
#  id                       :bigint           not null, primary key
#  article_length           :integer
#  revisions_count          :integer
#  timestamp                :date
#  token_count              :integer
#  wp10_prediction          :float
#  wp10_prediction_category :string
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  article_id               :bigint           not null
#  revision_id              :integer
#
# Indexes
#
#  index_article_timepoints_on_article_id  (article_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_id => articles.id)
#
