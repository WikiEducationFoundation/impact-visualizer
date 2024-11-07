# frozen_string_literal: true

require 'rails_helper'

describe ImportService do
  let(:topic) { create(:topic) }
  let(:import_service) { described_class.new(topic:) }

  describe '.initialize' do
    it 'initializes and has @topic variable' do
      expect(import_service).to be_a(described_class)
      expect(import_service.topic).to eq(topic)
    end
  end

  describe '#import_articles' do
    before do
      topic.articles_csv.attach(
        io: File.open('spec/fixtures/csv/topic-articles-test.csv'),
        filename: 'topic-articles-test.csv'
      )
    end

    it 'imports articles for topic', :vcr do
      import_service.import_articles
      expect(topic.article_bags.count).to eq(1)
      expect(topic.active_article_bag.name).to eq("#{topic.slug.titleize} Articles")
      expect(topic.articles.count).to eq(4)
      expect(topic.articles.pluck(:missing)).to eq([false, false, false, false])
    end

    it 'marks non-existent articles as missing', vcr: false do
      topic.articles_csv.attach(
        io: File.open('spec/fixtures/csv/topic-articles-missing-test.csv'),
        filename: 'topic-articles-missing-test.csv'
      )
      import_service.import_articles
      expect(topic.article_bags.count).to eq(1)
      expect(topic.active_article_bag.name).to eq("#{topic.slug.titleize} Articles")
      expect(topic.articles.count).to eq(3)
      expect(topic.articles.pluck(:missing)).to eq([true, true, true])
    end

    it 'calls status counter methods', :vcr do
      counter = instance_double('counter')
      expect(counter).to receive(:total).once
      expect(counter).to receive(:at).exactly(4).times
      import_service.import_articles total: counter.method(:total), at: counter.method(:at)
      expect(topic.articles.count).to eq(4)
    end

    it 'raises if CSV not specified' do
      topic.articles_csv.purge
      expect do
        import_service.import_articles
      end.to raise_error(ImpactVisualizerErrors::CsvMissingForImport)
    end
  end

  describe '#import_users' do
    before do
      topic.users_csv.attach(
        io: File.open('spec/fixtures/csv/topic-users-test.csv'),
        filename: 'topic-users-test.csv'
      )
    end

    it 'imports users for topic', :vcr do
      import_service.import_users
      expect(topic.users.count).to eq(5)
    end

    it 'calls status counter methods', :vcr do
      counter = instance_double('counter')
      expect(counter).to receive(:total).once
      expect(counter).to receive(:at).exactly(5).times
      import_service.import_users total: counter.method(:total), at: counter.method(:at)
      expect(topic.users.count).to eq(5)
    end

    it 'raises if CSV not specified' do
      topic.users_csv.purge
      expect do
        import_service.import_users
      end.to raise_error(ImpactVisualizerErrors::CsvMissingForImport)
    end
  end
end
