# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Article do
  it { is_expected.to have_many(:article_bag_articles) }
  it { is_expected.to have_many(:article_bags).through(:article_bag_articles) }
  it { is_expected.to have_many(:article_timepoints) }
end

# == Schema Information
#
# Table name: articles
#
#  id                     :integer          not null, primary key
#  first_revision_at      :datetime
#  first_revision_by_name :string
#  pageid                 :integer
#  title                  :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  first_revision_by_id   :integer
#  first_revision_id      :integer
#
