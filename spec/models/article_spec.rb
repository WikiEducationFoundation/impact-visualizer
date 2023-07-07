# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Article do
  it { is_expected.to have_many(:article_bag_articles) }
  it { is_expected.to have_many(:article_bags).through(:article_bag_articles) }
  it { is_expected.to have_many(:article_timepoints) }

  describe '#exists_at_timestamp?' do
    let!(:article) do
      create(
        :article,
        pageid: 2364730,
        title: 'Yankari Game Reserve',
        first_revision_at: Date.new(2023, 1, 1),
        first_revision_id: 123,
        first_revision_by_id: 234,
        first_revision_by_name: 'name'
      )
    end

    it 'returns true if Article was created before timestamp' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp - 1.day
      expect(article.exists_at_timestamp?(timestamp)).to eq(true)
    end

    it 'returns false if Article was created after timestamp' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp + 1.day
      expect(article.exists_at_timestamp?(timestamp)).to eq(false)
    end

    it 'raises if Article is missing first revision info' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: nil
      expect do
        article.exists_at_timestamp?(timestamp)
      end.to raise_error(ImpactVisualizerErrors::ArticleMissingFirstRevisionInfo)
    end
  end
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
