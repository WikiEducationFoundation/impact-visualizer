// NPM
import _ from 'lodash';
import React from 'react';
import { SubmitHandler, FieldValues } from 'react-hook-form';
import { Link, useLoaderData } from 'react-router-dom';

// Types
import Topic from '../types/topic.type';

// Components
import TopicForm from './topic-form.component';

// Misc
import TopicService from '../services/topic.service';

function EditTopic() {
  const { topic } = useLoaderData() as { topic: Topic };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    console.log(data);
    return
    TopicService.createTopic(data)
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      })
  }

  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div>
          <div className='u-mb1'>
            <Link to='/my-topics'>← Back to My Topics</Link>
          </div>
          
          <h1>Edit Topic</h1>

          <TopicForm
            onSubmit={onSubmit}
            defaultValues={topic}
          />
        </div>
      </div>
    </section>
  )
}

export default EditTopic;