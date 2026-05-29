# frozen_string_literal: true

class Wiki < ApplicationRecord
  ## Associations
  has_many :topics
  has_many :articles
  has_many :users

  ## Constants
  PROJECTS = %w[
    wikipedia
    wikibooks
    wikidata
    wikimedia
    wikinews
    wikiquote
    wikisource
    wikiversity
    wikivoyage
    wiktionary
  ].freeze

  LANGUAGES = %w[
    aa ab ace ady af ak als alt am ami an ang ar arc ary arz as ast atj av avk ay awa az azb
    ba ban bar bat-smg bcl be be-tarask be-x-old bg bh bi bjn blk bm bn bo bpy br bs
    bug bxr ca cbk-zam cdo ce ceb ch cho chr chy ckb cmn co commons cr crh cs csb cu
    cv cy da dag de din diq dk dsb dty dv dz ee egl el eml en eo epo es et eu ext fa fat
    ff fi fiu-vro fj fo fr frp frr fur fy ga gag gan gcr gd gl glk gn gom gor got gsw
    gu guc gur guw gv ha hak haw he hi hif ho hr hsb ht hu hy hyw hz ia id ie ig ii ik ilo
    incubator inh io is it iu ja jam jbo jp jv ka kaa kab kcg kbd kbp kg ki kj kk kl km kn ko
    koi kr krc ks ksh ku kv kw ky la lad lb lbe lez lfn lg li lij lld lmo ln lo lrc lt
    ltg lv lzh mad mai map-bms mdf mg mh mhr mi min minnan mk ml mn mni mnw mo mr mrj ms mt
    mus mwl my myv mzn na nah nan nap nb nds nds-nl ne new ng nia nl nn no nov nqo nrm
    nso nv ny oc olo om or os pa pag pam pap pcd pcm pdc pfl pi pih pl pms pnb pnt ps
    pt pwn qu rm rmy rn ro roa-rup roa-tara ru rue rup rw sa sah sat sc scn sco sd se
    sg sgs sh shi shn shy si simple sk skr sl sm smn sn so sq sr srn ss st stq su sv sw szl
    szy ta tay tcy te tet tg th ti tk tl tn to tpi tr trv ts tt tum tw ty tyv udm ug uk
    ur uz ve vec vep vi vls vo vro w wa war wikipedia wo wuu xal xh xmf yi yo yue za
    zea zh zh-cfr zh-classical zh-cn zh-min-nan zh-tw zh-yue zu
  ].freeze

  ## Validations
  validates_uniqueness_of :project, scope: :language, case_sensitive: false
  validates_inclusion_of :project, in: PROJECTS
  validates_inclusion_of :language, in: LANGUAGES

  # Fallback used when the wiki's language is not in the empirical
  # study (rare; small/new wikis or non-Wikipedia projects). 3.0 is
  # roughly the median of medians from the May 2026 study and lands
  # within the bulk of measured languages' IQRs.
  TOKENS_PER_WORD_GLOBAL_FALLBACK = 3.0

  ## Class methods
  def self.default_wiki
    wiki = find_or_create_by language: 'en', project: 'wikipedia'
    wiki.update wikidata_site: 'enwiki' if wiki.wikidata_site.nil?
    wiki
  end

  # Per-language median tokens_per_word from the empirical study at
  # config/words_per_token.yml. See docs/words-per-token-methodology.md.
  # Memoized at class level — the YAML is small and immutable at runtime.
  def self.tokens_per_word_table
    @tokens_per_word_table ||= begin
      path = Rails.root.join('config', 'words_per_token.yml')
      data = path.exist? ? YAML.safe_load_file(path) : {}
      (data['languages'] || {}).transform_values { |entry|
        entry['median_tokens_per_word']
      }.compact
    end
  end

  # Reset the memoized table — useful in specs.
  def self.reset_tokens_per_word_table!
    @tokens_per_word_table = nil
  end

  ## Instance methods
  def domain
    "#{language}.#{project}.org"
  end

  def base_url
    'https://' + domain
  end

  def action_api_url
    "#{base_url}/w/api.php"
  end

  def rest_api_url
    "#{base_url}/w/rest.php/v1/"
  end

  # For ActiveAdmin
  def self.ransackable_associations(auth_object = nil)
    ['topics']
  end

  def self.ransackable_attributes(auth_object = nil)
    %w[created_at id language project updated_at]
  end

  def name
    "#{project} (#{language})"
  end

  # Empirically-derived median tokens_per_word for this wiki's language,
  # falling back to TOKENS_PER_WORD_GLOBAL_FALLBACK when the language
  # isn't in the study. Used as the default divisor for converting
  # WikiWho token counts into reader-facing word counts; topics may
  # override via Topic#tokens_per_word.
  def tokens_per_word_default
    self.class.tokens_per_word_table[language] || TOKENS_PER_WORD_GLOBAL_FALLBACK
  end
end

# == Schema Information
#
# Table name: wikis
#
#  id            :bigint           not null, primary key
#  language      :string(16)
#  project       :string(16)
#  wikidata_site :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  index_wikis_on_language_and_project  (language,project) UNIQUE
#
