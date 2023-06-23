# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  it { is_expected.to have_many(:topic_users) }
  it { is_expected.to have_many(:topics).through(:topic_users) }
end

# == Schema Information
#
# Table name: users
#
#  id           :integer          not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  wiki_user_id :integer
#
