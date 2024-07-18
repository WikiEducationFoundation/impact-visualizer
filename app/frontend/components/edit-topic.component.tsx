// NPM
import _ from 'lodash';
import React from 'react';
import { SubmitHandler, FieldValues } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';

// Components
import TopicForm from './topic-form.component';
import Spinner from './spinner.component';

// Misc
import TopicService from '../services/topic.service';

function EditTopic() {
  const navigate = useNavigate();
  const { id } = useParams() as { id: string };

  const { status, data: topic } = useQuery({
    queryKey: ['topic', id],
    queryFn: ({ queryKey }) => TopicService.getTopic(queryKey[1])
  });

  const updateMutation = useMutation({
    mutationFn: (data: FieldValues) => {
      return TopicService.updateTopic(id, data);
    },
    onSuccess: (response) => {
      navigate(`/topics/${response.id}`);
    },
    onError: (error) => {
      console.log(error);
    },
  })

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    updateMutation.mutate(data);
  }

  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div>
          <div className='u-mb1'>
            <Link
              to={`/topics/${id}`}
            >
              ← Back
            </Link>
          </div>
          
          <h1>Edit Topic</h1>

          {status === 'pending' && <Spinner />}
          {(status !== 'pending' && topic) &&
            <TopicForm
              onSubmit={onSubmit}
              defaultValues={topic}
              saving={updateMutation.isPending}
            />
          }
        </div>
      </div>
    </section>
  )
}

export default EditTopic;
