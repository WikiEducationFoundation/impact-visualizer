# frozen_string_literal: true

ActiveAdmin.register Topic do
  filter :name
  filter :description
  filter :slug

  permit_params :name, :description, :slug, :timepoint_day_interval, :start_date,
                :end_date, :wiki_id, :editor_label, :display, :chart_time_unit

  index do
    selectable_column
    column :id
    column :name
    column :slug
    column :wiki
    column :articles do |record|
      record.articles.count
    end
    column :users do |record|
      record.users.count
    end
    column :timeframe do |record|
      raw "#{record.start_date.strftime('%-m/%-d/%Y')}&ndash;#{record.end_date&.strftime('%-m/%-d/%Y') || 'Now'}"
    end
    column :timepoint_day_interval
    column :display
    actions
  end

  form do |f|
    f.semantic_errors

    inputs do
      input :name
      input :slug
      input :description
      input :wiki
      input :editor_label, hint: 'What should participants be called? Should be singular and lowercase, such as "participant"'
      input :display, hint: 'Should the Topic be displayed on the front-end?'
      input :timepoint_day_interval, hint: 'How many days between timepoints? WARNING: this number has a significant impact on the processing time required to generate timepoints. Set as high as possible for the time frame.'
      input :start_date, as: :date_select
      input :end_date, as: :date_select
    end

    f.actions
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                     :bigint           not null, primary key
#  chart_time_unit        :string           default("year")
#  description            :string
#  display                :boolean          default(TRUE)
#  editor_label           :string           default("participant")
#  end_date               :datetime
#  name                   :string
#  slug                   :string
#  start_date             :datetime
#  timepoint_day_interval :integer          default(7)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  wiki_id                :integer
#
