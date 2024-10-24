# frozen_string_literal: true

require 'rails_helper'

describe WikidataTranslator do
  let!(:wiki) { Wiki.default_wiki }
  let!(:subject) { described_class.new(wiki:) }

  it 'preloads ID translations' do
    ids = %w[Q6581097 Q6581072]
    subject.preload(ids:)
    expect(subject.labels).to eq({
      'Q6581072' => 'female',
      'Q6581097' => 'male'
    })
  end

  it 'translates an ID' do
    ids = %w[Q6581097 Q6581072]
    subject.preload(ids:)
    expect(subject.translate('Q6581097')).to eq('male')
    expect(subject.translate('Q6581072')).to eq('female')
  end

  it 'returns ID for missing translation' do
    ids = %w[Q6581097 Q6581072]
    subject.preload(ids:)
    expect(subject.translate('Q123')).to eq('Q123')
  end
end
