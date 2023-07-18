# frozen_string_literal: true

class OresScoreTransformer
  # ORES articlequality ratings are often derived from the en.wiki system,
  # so this is the fallback scheme.
  ENWIKI_WEIGHTING = { 'FA' => 100,
                       'GA' => 80,
                       'B' => 60,
                       'C' => 40,
                       'Start' => 20,
                       'Stub' => 0 }.freeze
  FRWIKI_WEIGHTING = { 'adq' => 100,
                       'ba' => 80,
                       'a' => 60,
                       'b' => 40,
                       'bd' => 20,
                       'e' => 0 }.freeze
  TRWIKI_WEIGHTING = { 'sm' => 100,
                       'km' => 80,
                       'b' => 60,
                       'c' => 40,
                       'baslagıç' => 20,
                       'taslak' => 0 }.freeze
  RUWIKI_WEIGHTING = { 'ИС' => 100,
                       'ДС' => 80,
                       'ХС' => 80,
                       'I' => 60,
                       'II' => 40,
                       'III' => 20,
                       'IV' => 0 }.freeze

  WEIGHTING_BY_LANGUAGE = {
    'en' => ENWIKI_WEIGHTING,
    'simple' => ENWIKI_WEIGHTING,
    'fa' => ENWIKI_WEIGHTING,
    'eu' => ENWIKI_WEIGHTING,
    'fr' => FRWIKI_WEIGHTING,
    'tr' => TRWIKI_WEIGHTING,
    'ru' => RUWIKI_WEIGHTING
  }.freeze

  def self.weighted_mean_score_from_probabilities(probabilities:, language:)
    return unless probabilities
    mean = 0
    weighting(language:).each do |rating, weight|
      mean += probabilities[rating] * weight
    end
    mean
  end

  def self.weighting(language:)
    WEIGHTING_BY_LANGUAGE[language]
  end
end
