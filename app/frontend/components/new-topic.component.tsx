import _ from 'lodash';
import React, { useState } from 'react';
import { useForm, SubmitHandler, FieldValues } from "react-hook-form"
import { useLoaderData, Link } from "react-router-dom";

import Wiki from '../types/wiki.type';

import Input from './input.component';
import DateInput from './date-input.component';
import TextArea from './text-area.component';

const defaultValues = {
  name: '',
  description: '',
  editor_label: 'participant',
  timepoint_day_interval: 30
}

function NewTopic() {
  const { wikis } = useLoaderData() as { wikis: Array<Wiki> };
  const { handleSubmit, control } = useForm<FieldValues>({ defaultValues })

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    console.log(data);
  }

  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div className='NewTopic'>
          <div className='u-mb1'>
            <Link to='/my-topics'>← Back to My Topics</Link>
          </div>
          
          <h1>Create New Topic</h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="Form"
          >
            <div className="FormRow">
              <Input
                name="name"
                label="Topic Name"
                control={control}
                rules={{ required: 'A topic name is required' }}
              />

              <Input
                name="slug"
                label="Topic Slug"
                control={control}
                rules={{ required: 'A topic slug is required' }}
                hint="A URL friendly version of your topic's name"
              />
            </div>

            <div className="FormRow">
              <TextArea
                name="description"
                label="Topic Description"
                control={control}
                rules={{ required: 'A description is required' }}
                hint="A brief description of the Topic"
              />
            </div>

            <div className="FormRow">
              <Input
                name="wiki"
                label="Related Wiki Project"
                control={control}
              />

              <Input
                name="editor_label"
                label="Participant Label"
                hint='Default is "participant"'
                control={control}
              />
            </div>

            <div className="FormRow">
              <DateInput
                name="start_date"
                label="Start Date"
                hint='The start date for the topic analysis'
                control={control}
              />

              <DateInput
                name="end_date"
                label="End Date"
                hint='The end date for the topic analysis'
                control={control}
              />

            </div>

            <div className="FormRow">
              <Input
                name="timepoint_day_interval"
                label="Timepoint Day Interval"
                type='number'
                min={7}
                hint='The number of days between each analysis timepoint. Smaller values will provide greater analysis resolution but result in longer computation processes. 30 days is generally a good starting value.'
                control={control}
              />
            </div>
            
            <div className="FormRow">
              <input
                className="Button"
                type="submit"
              />
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default NewTopic;