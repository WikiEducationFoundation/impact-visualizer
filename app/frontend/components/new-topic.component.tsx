// NPM
import _ from 'lodash';
import React from 'react';
import { SubmitHandler, FieldValues } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

// Components
import TopicForm from './topic-form.component';

// Misc
import TopicService from '../services/topic.service';

const defaultValues = {
  name: '',
  description: '',
  slug: '',
  editor_label: 'participant',
  timepoint_day_interval: 365,
  chart_time_unit: 'year'
}

function NewTopic() {
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: TopicService.createTopic,
    onSuccess: (response) => {
      navigate(`/topics/${response.id}`);
    },
    onError: (error) => {
      console.log(error);
    },
  })

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    createMutation.mutate(data);
  }

  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div>
          <div className='u-mb1'>
            <Link to='/my-topics'>← Back to My Topics</Link>
          </div>
          
          <h1>Create New Topic</h1>

          <TopicForm
            onSubmit={onSubmit}
            defaultValues={defaultValues}
            saving={createMutation.isPending}
          />
        </div>
      </div>
    </section>
  )
}

export default NewTopic;