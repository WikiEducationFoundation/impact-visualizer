# frozen_string_literal: true

require 'rails_helper'
require './spec/support/shared_contexts'

describe ArticleStatsService do
  let(:wiki) { Wiki.default_wiki }

  describe '#update_article_details' do
    it 'captures pageid given title', :vcr do
      article = create(:article, pageid: nil, title: 'Yankari Game Reserve')
      article_stats_service = described_class.new(wiki)
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.missing).to eq(false)
      expect(article.pageid).to eq(2364730)
    end

    it 'captures title given pageid', :vcr do
      article = create(:article, pageid: 2364730, title: nil)
      article_stats_service = described_class.new(wiki)
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.missing).to eq(false)
      expect(article.title).to eq('Yankari Game Reserve')
    end

    it 'captures first revision details', :vcr do
      article = create(:article, pageid: 2364730, first_revision_id: nil)
      article_stats_service = described_class.new(wiki)
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.first_revision_id).to eq(20142847)
      expect(article.first_revision_at).to eq('2005-08-02 21:43:23')
      expect(article.first_revision_by_name).to eq('Jamie7687')
      expect(article.first_revision_by_id).to eq(311307)
    end

    it 'marks article as missing if no pageid' do
      article = create(:article, pageid: nil, title: 'Yankaaaari Game Reserve')
      article_stats_service = described_class.new(wiki)
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.missing).to eq(true)
      expect(article.pageid).to eq(nil)
    end

    it 'marks previously missing article as not missing' do
      article = create(:article, pageid: nil, title: 'Yankari Game Reserve', missing: true)
      article_stats_service = described_class.new(wiki)
      article_stats_service.update_details_for_article(article:)
      article.reload
      expect(article.missing).to eq(false)
      expect(article.pageid).to eq(2364730)
    end
  end

  describe '#update_stats_for_article_timepoint' do
    context 'when the article exists at timestamp' do
      let!(:article_stats_service) { described_class.new(wiki) }
      let!(:article) { create(:article, pageid: 2364730, title: 'Yankari Game Reserve') }
      let!(:article_timepoint) do
        create(:article_timepoint, article:, timestamp: Date.new(2023, 1, 1))
      end

      before do
        article_stats_service.update_first_revision_info(article:)
        article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
        article_timepoint.reload
      end

      it 'captures revision_id', :vcr do
        expect(article_timepoint.revision_id).to eq(1100917005)
      end

      it 'captures article_length', :vcr do
        expect(article_timepoint.article_length).to eq(13079)
      end

      it 'updates revisions_count', :vcr do
        expect(article_timepoint.revisions_count).to eq(261)
      end

      it 'updates wp10_prediction', vcr: true do
        expect(article_timepoint.wp10_prediction).to eq(58.17099374142291)
        expect(article_timepoint.wp10_prediction_category).to eq('C')
      end
    end

    context 'when article exists at timestamp but LiftWing not available' do
      let!(:wiki) { Wiki.create(language: 'de', project: 'wikipedia') }
      let!(:article_stats_service) { described_class.new(wiki) }
      let!(:article) { create(:article, pageid: 19129, title: 'Helen Otley', wiki:) }
      let!(:article_timepoint) do
        create(:article_timepoint, article:, timestamp: Date.new(2024, 6, 1))
      end

      before do
        article_stats_service.update_first_revision_info(article:)
        article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
        article_timepoint.reload
      end

      it 'captures revision_id', vcr: true do
        expect(article_timepoint.revision_id).to eq(243145509)
      end

      it 'captures article_length', vcr: true do
        expect(article_timepoint.article_length).to eq(3531)
      end

      it 'updates revisions_count', vcr: true do
        expect(article_timepoint.revisions_count).to eq(102)
      end

      it 'does not update wp10_prediction', vcr: true do
        expect(article_timepoint.wp10_prediction).to be_nil
        expect(article_timepoint.wp10_prediction_category).to be_nil
      end
    end

    context 'when the article does not exist at timestamp' do
      let!(:article_stats_service) { described_class.new(wiki) }
      let!(:article) { create(:article, pageid: 2364730, title: 'Yankari Game Reserve') }
      let!(:article_timepoint) do
        create(:article_timepoint, article:, timestamp: Date.new(2001, 1, 1))
      end

      it 'captures revision_id', vcr: false do
        article_stats_service.update_first_revision_info(article:)
        expect do
          article_stats_service.update_stats_for_article_timepoint(article_timepoint:)
        end.to raise_error(ImpactVisualizerErrors::ArticleCreatedAfterTimestamp)
      end
    end
  end

  describe '#weighted_revision_quality' do
    let!(:article_stats_service) { described_class.new(wiki) }

    it 'returns the weighted quality of revision', vcr: false do
      lift_wing_api = LiftWingApi.new(wiki)
      lift_wing_response = lift_wing_api.get_revision_quality(1100917005)
      quality = article_stats_service.weighted_revision_quality(lift_wing_response:)
      expect(quality).to be_a(Numeric)
    end
  end

  describe '#update_token_stats' do
    let!(:article_stats_service) { described_class.new(wiki) }
    let!(:article) { create(:article, pageid: 2364730, title: 'Yankari Game Reserve') }
    let!(:revision_id) { 1100917005 }
    let!(:timestamp) { Date.new(2023, 1, 1) }
    let!(:article_timepoint) { create(:article_timepoint, article:, timestamp:, revision_id:) }

    it 'captures token_count', vcr: true do
      tokens = WikiWhoApi.new(wiki: Wiki.default_wiki).get_revision_tokens(revision_id)
      article_stats_service.update_first_revision_info(article:)
      article_stats_service.update_token_stats(article_timepoint:, tokens:)
      expect(article_timepoint.token_count).to eq(2984)
    end
  end
end
