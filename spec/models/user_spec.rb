# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  it { is_expected.to have_many(:topic_users) }
  it { is_expected.to have_many(:topics).through(:topic_users) }

  describe '#update_id_and_name' do
    let!(:wiki) { Wiki.default_wiki }

    it 'updates the user name, if given an ID', :vcr do
      user = described_class.create(wiki_user_id: 25848390, wiki:)
      user.update_name_and_id
      user.reload
      expect(user.name).to eq('TiltuM')
    end

    it 'updates the user ID, if given a name', :vcr do
      user = described_class.create(wiki_user_id: 25848390, wiki:)
      user.update_name_and_id
      user.reload
      expect(user.wiki_user_id).to eq(25848390)
    end
  end
end

# == Schema Information
#
# Table name: users
#
#  id           :bigint           not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  wiki_id      :bigint           not null
#  wiki_user_id :integer
#
# Indexes
#
#  index_users_on_wiki_id  (wiki_id)
#
# Foreign Keys
#
#  fk_rails_...  (wiki_id => wikis.id)
#
