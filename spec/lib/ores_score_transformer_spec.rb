# frozen_string_literal: true

require 'rails_helper'

describe OresScoreTransformer do
  context 'enwiki' do
    it 'transforms probabilities into weighted mean' do
      probabilities = {
        'B' => 0.10079731357067488,
        'C' => 0.06586256200112978,
        'FA' => 0.004111470759849595,
        'GA' => 0.008487597970812858,
        'Start' => 0.2943603130674627,
        'Stub' => 0.5263807426300702
      }
      score = described_class.weighted_mean_score_from_probabilities(probabilities:, language: 'en')
      expect(score).to eq(15.659702469284927)
    end
  end

  context 'frwiki' do
    it 'transforms probabilities into weighted mean' do
      probabilities = {
        'a' => 0.10079731357067488,
        'b' => 0.06586256200112978,
        'adq' => 0.004111470759849595,
        'ba' => 0.008487597970812858,
        'bd' => 0.2943603130674627,
        'e' => 0.5263807426300702
      }
      score = described_class.weighted_mean_score_from_probabilities(probabilities:, language: 'fr')
      expect(score).to eq(15.659702469284927)
    end
  end

  context 'trwiki' do
    it 'transforms probabilities into weighted mean' do
      probabilities = {
        'b' => 0.10079731357067488,
        'c' => 0.06586256200112978,
        'sm' => 0.004111470759849595,
        'km' => 0.008487597970812858,
        'baslagıç' => 0.2943603130674627,
        'taslak' => 0.5263807426300702
      }
      score = described_class.weighted_mean_score_from_probabilities(probabilities:, language: 'tr')
      expect(score).to eq(15.659702469284927)
    end
  end

  context 'ruwiki' do
    it 'transforms probabilities into weighted mean' do
      probabilities = {
        'I' => 0.13564043967189335,
        'II' => 0.06536200070306097,
        'III' => 0.21208889239591908,
        'IV' => 0.5332896893269045,
        'ДС' => 0.011146434721844815,
        'ИС' => 0.02548110387810681,
        'ХС' => 0.016991439302270428
      }
      score = described_class.weighted_mean_score_from_probabilities(probabilities:, language: 'ru')
      expect(score).to eq(19.793824566094322)
    end
  end
end
