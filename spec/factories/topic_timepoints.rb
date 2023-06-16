FactoryBot.define do
  factory :topic_timepoint do
    length { 1 }
    length_delta { 1 }
    links_count { 1 }
    links_count_delta { 1 }
    articles_count { 1 }
    articles_count_delta { 1 }
    revisions_count { 1 }
    revisions_count_delta { 1 }
    attributed_length_delta { 1 }
    attributed_links_count_delta { 1 }
    attributed_revisions_count_delta { 1 }
    attributed_articles_created { 1 }
    topic { nil }
  end
end

# == Schema Information
#
# Table name: topic_timepoints
#
#  id                                :integer          not null, primary key
#  articles_count                    :integer
#  articles_count_delta              :integer
#  attributed_articles_created_delta :integer
#  attributed_length_delta           :integer
#  attributed_links_count_delta      :integer
#  attributed_revisions_count_delta  :integer
#  length                            :integer
#  length_delta                      :integer
#  links_count                       :integer
#  links_count_delta                 :integer
#  revisions_count                   :integer
#  revisions_count_delta             :integer
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  topic_id                          :integer          not null
#
# Indexes
#
#  index_topic_timepoints_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  topic_id  (topic_id => topics.id)
#
