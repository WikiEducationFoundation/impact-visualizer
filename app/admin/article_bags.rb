# ActiveAdmin.register ArticleBag do
#   permit_params :name, :topic_id

#   filter :topic

#   index do
#     column :id
#     column :name
#     column :topic
#     column :articles do |record|
#       record.articles.count
#     end
#     actions
#   end
# end

# == Schema Information
#
# Table name: article_bags
#
#  id         :bigint           not null, primary key
#  name       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  topic_id   :bigint           not null
#
# Indexes
#
#  index_article_bags_on_topic_id  (topic_id)
#
# Foreign Keys
#
#  fk_rails_...  (topic_id => topics.id)
#
