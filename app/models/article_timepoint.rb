class ArticleTimepoint < ApplicationRecord

  # TODO
  # - Add wp10_prediction
  # - Add some kind of timestamp (other than created_at)?

  # Associations
  belongs_to :article

end

# == Schema Information
#
# Table name: article_timepoints
#
#  id                   :integer          not null, primary key
#  article_length       :integer
#  links_count          :integer
#  revisions_count      :integer
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
