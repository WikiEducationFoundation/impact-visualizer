# frozen_string_literal: true

module RequestHelpers
  def stub_wikipedia_503_error
    stub_request(:get, /.*wikipedia.*/)
      .to_return(status: 503, body: '{}', headers: {})
  end

  def stub_wikipedia_429_error
    stub_request(:get, /.*wikipedia.*/)
      .to_return(status: 429, body: '{}', headers: {})
  end

  def stub_wiki_validation
    wikis = [
      'incubator.wikimedia.org',
      'es.wikipedia.org',
      'pt.wikipedia.org',
      'zh.wikipedia.org',
      'mr.wikipedia.org',
      'eu.wikipedia.org',
      'fa.wikipedia.org',
      'fr.wikipedia.org',
      'ru.wikipedia.org',
      'simple.wikipedia.org',
      'tr.wikipedia.org',
      'en.wiktionary.org',
      'es.wiktionary.org',
      'ta.wiktionary.org',
      'es.wikibooks.org',
      'en.wikibooks.org',
      'ar.wikibooks.org',
      'en.wikivoyage.org',
      'wikisource.org',
      'es.wikisource.org',
      'www.wikidata.org',
      'en.wikinews.org',
      'pl.wikiquote.org',
      'de.wikiversity.org',
      'commons.wikimedia.org',
      'de.wikipedia.org',
      'en.wikipedia.org'
    ]

    wikis.each do |wiki|
      stub_request(:get, "https://#{wiki}/w/api.php?action=query&format=json&meta=siteinfo")
        .to_return(status: 200,
                   body: "{\"query\":{\"general\":{\"servername\":\"#{wiki}\"}}}",
                   headers: {})
    end
  end
end
