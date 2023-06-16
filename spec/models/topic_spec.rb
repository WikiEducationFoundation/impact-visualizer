require 'rails_helper'

RSpec.describe Topic, type: :model do
  it { should have_many(:article_bags) }
  it { should have_many(:articles).through(:article_bags) }
  it { should have_many(:topic_users) }
  it { should have_many(:users).through(:topic_users) }
  it { should have_many(:topic_timepoints) }
end

# == Schema Information
#
# Table name: topics
#
#  id          :integer          not null, primary key
#  description :string
#  name        :string
#  slug        :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
