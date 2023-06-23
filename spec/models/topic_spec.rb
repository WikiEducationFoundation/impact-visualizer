# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Topic do
  it { is_expected.to have_many(:article_bags) }
  it { is_expected.to have_many(:articles).through(:article_bags) }
  it { is_expected.to have_many(:topic_users) }
  it { is_expected.to have_many(:users).through(:topic_users) }
  it { is_expected.to have_many(:topic_timepoints) }
  it { is_expected.to belong_to(:wiki) }
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
