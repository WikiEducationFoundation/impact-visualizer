# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ArticleTimepoint do
  it { is_expected.to belong_to(:article) }

  describe '.find_or_create_for_timestamp' do
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

    it 'creates and returns a new ArticleTimepoint' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp - 1.day
      expect(described_class.count).to eq(0)
      article_timepoint = described_class.find_or_create_for_timestamp(
        timestamp:, article:
      )
      expect(described_class.count).to eq(1)
      expect(article_timepoint).to be_a(described_class)
    end

    it 'yields if new ArticleTimepoint' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp - 1.day
      expect(described_class.count).to eq(0)
      new_article_timepoint = false
      article_timepoint = described_class.find_or_create_for_timestamp(
        timestamp:, article:
      ) { new_article_timepoint = true }
      expect(described_class.count).to eq(1)
      expect(new_article_timepoint).to eq(true)
      expect(article_timepoint).to be_a(described_class)
    end

    it 'does not yield if existing ArticleTimepoint' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp - 1.day
      existing_article_timepoint = described_class.find_or_create_by!(timestamp:, article:)
      expect(described_class.count).to eq(1)
      new_article_timepoint = false
      article_timepoint = described_class.find_or_create_for_timestamp(
        timestamp:, article:
      ) { new_article_timepoint = true }
      expect(described_class.count).to eq(1)
      expect(new_article_timepoint).to eq(false)
      expect(article_timepoint).to eq(existing_article_timepoint)
    end

    it 'finds and return an existing ArticleTimepoint' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp - 1.day
      existing_article_timepoint = described_class.find_or_create_by!(timestamp:, article:)
      expect(described_class.count).to eq(1)
      article_timepoint = described_class.find_or_create_for_timestamp(
        timestamp:, article:
      )
      expect(described_class.count).to eq(1)
      expect(article_timepoint).to eq(existing_article_timepoint)
    end

    it 'raises if Article missing first revision info' do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: nil
      expect(described_class.count).to eq(0)
      expect do
        described_class.find_or_create_for_timestamp(
          timestamp:, article:
        )
      end.to raise_error(ImpactVisualizerErrors::ArticleMissingFirstRevisionInfo)
      expect(described_class.count).to eq(0)
    end

    it "raises if timestamp predates Article's existence" do
      timestamp = Date.new(2023, 1, 1)
      article.update first_revision_at: timestamp + 1.day
      expect(described_class.count).to eq(0)
      expect do
        described_class.find_or_create_for_timestamp(
          timestamp:, article:
        )
      end.to raise_error(ImpactVisualizerErrors::ArticleCreatedAfterTimestamp)
      expect(described_class.count).to eq(0)
    end
  end
end

# == Schema Information
#
# Table name: article_timepoints
#
#  id              :bigint           not null, primary key
#  article_length  :integer
#  revisions_count :integer
#  timestamp       :date
#  token_count     :integer
#  wp10_prediction :float
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  article_id      :bigint           not null
#  revision_id     :integer
#
# Indexes
#
#  index_article_timepoints_on_article_id  (article_id)
#
# Foreign Keys
#
#  fk_rails_...  (article_id => articles.id)
#
