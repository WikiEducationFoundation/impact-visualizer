# frozen_string_literal: true

ActiveAdmin.register Topic do
  filter :name
  filter :description
  filter :slug

  permit_params :name, :description, :slug, :timepoint_day_interval, :start_date,
                :end_date, :wiki_id, :editor_label, :display, :chart_time_unit,
                :convert_tokens_to_words, :tokens_per_word,
                :users_csv, :articles_csv, classification_ids: []

  index do
    selectable_column
    column :id
    column :name
    column :slug
    column :wiki
    column :classifications do |record|
      record.classifications.map do |classification|
        link_to(classification.name, admin_classification_path(classification))
      end
    end
    column :articles do |record|
      record.articles.count
    end
    column :users do |record|
      record.users.count
    end
    column :timeframe do |record|
      end_date = 'Now'
      end_date = record.end_date.strftime('%-m/%-d/%Y') if record.end_date
      if record.start_date && end_date
        raw "#{record.start_date.strftime('%-m/%-d/%Y')}&ndash;#{end_date}"
      end
    end
    column :timepoint_day_interval
    column :display
    actions
  end

  show do
    panel 'Actions' do
      if topic.users_csv.attached? && topic.articles_csv.attached?
        div class: 'attributes_table' do
          table do
            tbody do
              tr do
                th do
                  'Generate Timepoints'
                end
                td do
                  if topic.timepoint_generate_job_id
                    span do
                      if Sidekiq::Status::status(topic.timepoint_generate_job_id) == :working
                        percent = Sidekiq::Status::pct_complete(topic.timepoint_generate_job_id)
                        status_tag("Working #{percent}%", class: 'green')
                      else
                        status_tag(Sidekiq::Status::status(topic.timepoint_generate_job_id), class: 'orange')
                      end
                    end
                    span style: 'margin-left: 5px' do
                      link_to('(More detail)', "/admin/sidekiq/statuses/#{topic.timepoint_generate_job_id}")
                    end
                  else
                    output = []
                    output << link_to('Queue Timepoint Generation (Force Updates)', generate_timepoints_admin_topic_path(force_updates: true))
                    output << '<br>'
                    output << link_to('Queue Timepoint Generation (Changes Only)', generate_timepoints_admin_topic_path(force_updates: false))
                    output.join.html_safe
                  end
                end
              end
              tr do
                th do
                  'Import Articles'
                end
                td do
                  if topic.article_import_job_id
                    span do
                      if Sidekiq::Status::status(topic.article_import_job_id) == :working
                        percent = Sidekiq::Status::pct_complete(topic.article_import_job_id)
                        status_tag("Working #{percent}%", class: 'green')
                      else
                        status_tag(Sidekiq::Status::status(topic.article_import_job_id), class: 'orange')
                      end
                    end
                    span style: 'margin-left: 5px' do
                      link_to('(More detail)', "/admin/sidekiq/statuses/#{topic.article_import_job_id}")
                    end
                  else
                    link_to 'Queue Articles import', import_articles_admin_topic_path
                  end
                end
              end
              tr do
                th do
                  'Import Users'
                end
                td do
                  if topic.users_import_job_id
                    span do
                      if Sidekiq::Status::status(topic.users_import_job_id) == :working
                        percent = Sidekiq::Status::pct_complete(topic.users_import_job_id)
                        status_tag("Working #{percent}%", class: 'green')
                      else
                        status_tag(Sidekiq::Status::status(topic.users_import_job_id), class: 'orange')
                      end
                    end
                    span style: 'margin-left: 5px' do
                      link_to('(More detail)', "/admin/sidekiq/statuses/#{topic.users_import_job_id}")
                    end
                  else
                    link_to 'Queue Users import', import_users_admin_topic_path
                  end
                end
              end
            end
          end
        end
      else
        para 'Please upload both "Users CSV" and "Articles CSV" in order to import or generate timepoints.', style: 'font-weight: bold; margin-bottom: 0'
      end
    end

    attributes_table title: 'Stats' do
      row :articles do |record|
        record.articles.count
      end
      row :users do |record|
        record.users.count
      end
      row :timepoints do |record|
        record.topic_timepoints.count
      end
      row :classifications do |record|
        record.classifications.map do |classification|
          link_to(classification.name, admin_classification_path(classification))
        end
      end
    end

    attributes_table do
      row :id
      row :name
      row :slug
      row :wiki
      row :editor_label
      row :description
      row :display
      row :start_date
      row :end_date
      row :timepoint_day_interval
      row :chart_time_unit
      row :convert_tokens_to_words
      row :tokens_per_word
      row :users_csv do
        if topic.users_csv.attached?
          link_to topic.users_csv.filename.to_s, url_for(topic.users_csv)
        end
      end
      row :articles_csv do
        if topic.articles_csv.attached?
          link_to topic.articles_csv.filename.to_s, url_for(topic.articles_csv)
        end
      end
      row :created_at
      row :updated_at
    end

    active_admin_comments
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
      input :convert_tokens_to_words
      input :tokens_per_word
      input :users_csv,
            as: :file,
            label: 'Users CSV',
            hint: topic.users_csv.attached? ? "Currently attached: #{topic.users_csv.filename.to_s}" : nil
      input :articles_csv,
            as: :file,
            label: 'Articles CSV',
            hint: topic.articles_csv.attached? ? "Currently attached: #{topic.articles_csv.filename.to_s}" : nil
      f.input :classifications, as: :check_boxes, collection: Classification.all.map { |c| [c.name, c.id] }
    end

    f.actions
  end

  member_action :import_users, method: [:get] do
    resource.queue_users_import
    redirect_to resource_path(resource), notice: 'User import queued'
  end

  member_action :import_articles, method: [:get] do
    resource.queue_articles_import
    redirect_to resource_path(resource), notice: 'Article import queued'
  end

  member_action :generate_timepoints, method: [:get] do
    resource.queue_generate_timepoints(force_updates: params[:force_updates])
    redirect_to resource_path(resource), notice: 'Timepoint generation queued'
  end
end

# == Schema Information
#
# Table name: topics
#
#  id                        :bigint           not null, primary key
#  chart_time_unit           :string           default("year")
#  convert_tokens_to_words   :boolean          default(FALSE)
#  description               :string
#  display                   :boolean          default(FALSE)
#  editor_label              :string           default("participant")
#  end_date                  :datetime
#  name                      :string
#  slug                      :string
#  start_date                :datetime
#  timepoint_day_interval    :integer          default(7)
#  tokens_per_word           :float            default(3.25)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  article_import_job_id     :string
#  timepoint_generate_job_id :string
#  users_import_job_id       :string
#  wiki_id                   :integer
#
