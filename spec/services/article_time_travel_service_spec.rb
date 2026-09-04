# frozen_string_literal: true

require 'rails_helper'

describe ArticleTimeTravelService do
  let(:topic) { create(:topic) }
  let(:article_bag) { topic.active_article_bag }
  let(:service) { described_class.new(topic) }
  let(:current_year) { Date.current.year }

  def add_article(title:, pageid:, first_revision_at: Date.new(2010, 1, 1))
    article = create(:article, title:, pageid:, first_revision_at:)
    create(:article_bag_article, article:, article_bag:)
    article
  end

  describe 'validation' do
    before { add_article(title: 'Forest', pageid: 1) }

    it 'rejects an empty article list' do
      expect { service.call(article_titles: [], start_year: 2016, end_year: 2020) }
        .to raise_error(described_class::InvalidRequest, /At least one article/)
    end

    it 'rejects titles outside the active article bag' do
      expect { service.call(article_titles: ['Rainforest'], start_year: 2016, end_year: 2020) }
        .to raise_error(described_class::InvalidRequest, /Unknown articles: Rainforest/)
    end

    it 'rejects a start year before MIN_YEAR' do
      expect { service.call(article_titles: ['Forest'], start_year: 2010, end_year: 2020) }
        .to raise_error(described_class::InvalidRequest, /between 2015/)
    end

    it 'rejects an end year in the future' do
      expect {
        service.call(article_titles: ['Forest'], start_year: 2016, end_year: current_year + 1)
      }
        .to raise_error(described_class::InvalidRequest, /between 2015/)
    end

    it 'rejects a start year that is not before the end year' do
      expect { service.call(article_titles: ['Forest'], start_year: 2020, end_year: 2020) }
        .to raise_error(described_class::InvalidRequest, /before end year/)
    end
  end

  describe '#call' do
    let(:stats_service) { instance_double(ArticleStatsService) }

    before do
      allow(ArticleStatsService).to receive(:new).and_return(stats_service)
      allow(stats_service).to receive(:update_details_for_article)
    end

    it 'returns a snapshot per article per year' do
      add_article(title: 'Forest', pageid: 1)
      allow(stats_service).to receive(:get_article_size_at_date).and_return(1000, 2000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(100, 200)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(10, 20)
      allow(stats_service).to receive(:get_average_daily_views).and_return(5.4, 9.6)

      result = service.call(article_titles: ['Forest'], start_year: 2016, end_year: 2020)

      expect(result).to eq(
        'Forest' => {
          '2016' => { article_size: 1000, lead_section_size: 100, talk_size: 10,
                      average_daily_views: 5 },
          '2020' => { article_size: 2000, lead_section_size: 200, talk_size: 20,
                      average_daily_views: 10 }
        }
      )
    end

    it 'returns nil for a year before the article existed' do
      add_article(title: 'Taiga', pageid: 2, first_revision_at: Date.new(2018, 6, 1))
      allow(stats_service).to receive(:get_article_size_at_date).and_return(2000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(200)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(20)
      allow(stats_service).to receive(:get_average_daily_views).and_return(9.0)

      result = service.call(article_titles: ['Taiga'], start_year: 2016, end_year: 2020)

      expect(result['Taiga']['2016']).to be_nil
      expect(result['Taiga']['2020']).to include(article_size: 2000)
    end

    it 'returns nil for a year whose revision lookup fails' do
      add_article(title: 'Forest', pageid: 1)
      allow(stats_service).to receive(:get_article_size_at_date).and_return(nil, 2000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(200)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(20)
      allow(stats_service).to receive(:get_average_daily_views).and_return(9.0)

      result = service.call(article_titles: ['Forest'], start_year: 2016, end_year: 2020)

      expect(result['Forest']['2016']).to be_nil
      expect(result['Forest']['2020']).to include(article_size: 2000)
    end

    it 'keeps a nil metric alongside the ones that resolved' do
      add_article(title: 'Forest', pageid: 1)
      allow(stats_service).to receive(:get_article_size_at_date).and_return(1000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(100)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(nil)
      allow(stats_service).to receive(:get_average_daily_views)
        .and_raise(StandardError, 'pageviews down')

      result = service.call(article_titles: ['Forest'], start_year: 2016, end_year: 2020)

      expect(result['Forest']['2016']).to eq(
        article_size: 1000, lead_section_size: 100, talk_size: nil, average_daily_views: nil
      )
    end

    it 'returns empty snapshots for a missing article' do
      article = add_article(title: 'Forest', pageid: 1)
      article.update!(missing: true)

      result = service.call(article_titles: ['Forest'], start_year: 2016, end_year: 2020)

      expect(result).to eq('Forest' => { '2016' => nil, '2020' => nil })
    end

    it 'clamps the pageviews window to July 2015' do
      add_article(title: 'Forest', pageid: 1)
      allow(stats_service).to receive(:get_article_size_at_date).and_return(1000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(100)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(10)
      allow(stats_service).to receive(:get_average_daily_views).and_return(5.0)

      service.call(article_titles: ['Forest'], start_year: 2015, end_year: 2020)

      expect(stats_service).to have_received(:get_average_daily_views)
        .with(hash_including(start_year: 2015, start_month: 7, start_day: 1))
      expect(stats_service).to have_received(:get_average_daily_views)
        .with(hash_including(start_year: 2020, start_month: 1, start_day: 1))
    end

    it 'clamps the snapshot date to today for the current year' do
      add_article(title: 'Forest', pageid: 1)
      allow(stats_service).to receive(:get_article_size_at_date).and_return(1000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(100)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(10)
      allow(stats_service).to receive(:get_average_daily_views).and_return(5.0)

      service.call(article_titles: ['Forest'], start_year: 2016, end_year: current_year)

      expect(stats_service).to have_received(:get_article_size_at_date)
        .with(hash_including(date: Date.current))
    end

    it 'treats an article with only first_revision_at as existing' do
      article = add_article(title: 'Forest', pageid: 1)
      article.update!(first_revision_by_id: nil, first_revision_id: nil)
      allow(stats_service).to receive(:get_article_size_at_date).and_return(1000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(100)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(10)
      allow(stats_service).to receive(:get_average_daily_views).and_return(5.0)

      result = service.call(article_titles: ['Forest'], start_year: 2016, end_year: 2020)

      expect(result['Forest']['2016']).to include(article_size: 1000)
    end

    it 'does not drop results when fanning out across threads' do
      titles = Array.new(12) do |i|
        "Article #{i}".tap { |t| add_article(title: t, pageid: 100 + i) }
      end
      allow(stats_service).to receive(:get_article_size_at_date).and_return(1000)
      allow(stats_service).to receive(:get_lead_section_size_at_date).and_return(100)
      allow(stats_service).to receive(:get_talk_page_size_at_date).and_return(10)
      allow(stats_service).to receive(:get_average_daily_views).and_return(5.0)

      result = service.call(article_titles: titles, start_year: 2016, end_year: 2020)

      expect(result.keys).to match_array(titles)
      expect(result.values.map { |years| years['2016'][:article_size] }).to all(eq(1000))
    end
  end
end
