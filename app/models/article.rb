# frozen_string_literal: true

class Article < ApplicationRecord
  # Associations
  has_many :article_bag_articles
  has_many :article_bags, through: :article_bag_articles
  has_many :article_timepoints
end

# == Schema Information
#
# Table name: articles
#
#  id         :integer          not null, primary key
#  title      :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  page_id    :integer
#
