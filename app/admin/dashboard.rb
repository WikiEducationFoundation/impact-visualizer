# frozen_string_literal: true

ActiveAdmin.register_page 'Dashboard' do
  menu priority: 1, label: proc { I18n.t('active_admin.dashboard') }

  content title: proc { I18n.t('active_admin.dashboard') } do
    columns do
      column do
        panel 'Topics' do
          ul do
            Topic.all.limit(20).map do |topic|
              li link_to(topic.name, admin_topic_path(topic))
            end
          end

          div do
            link_to('Create New Topic', new_admin_topic_path, class: 'button')
          end
        end
      end

      column do
      end
    end
  end
end
