# frozen_string_literal: true

class Topic < ApplicationRecord
  # TODO
  # - High-level caching of deltas between first/last topic_timepoints.
  #   Perhaps with another model though? ... so snapshots can be taken over time.

  # Associations
  belongs_to :wiki
  has_many :article_bags
  has_many :articles, through: :article_bags
  has_many :topic_users
  has_many :users, through: :topic_users
  has_many :topic_timepoints
end

# == Schema Information
#
# Table name: topics
#
#  id                     :integer          not null, primary key
#  description            :string
#  name                   :string
#  slug                   :string
#  timepoint_day_interval :integer          default(7)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  wiki_id                :integer
#
