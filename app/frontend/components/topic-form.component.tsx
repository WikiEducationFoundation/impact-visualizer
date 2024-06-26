// NPM
import _ from 'lodash';
import React from 'react';
import { useForm, FieldValues } from 'react-hook-form';
import { useLoaderData } from 'react-router-dom';

// Types
import Wiki from '../types/wiki.type';

// Components
import GenericInput from './generic-input.component';
import FileInput from './file-input.component';
import SelectInput from './select-input.component';
import DateInput from './date-input.component';
import TextAreaInput from './text-area-input.component';

function TopicForm({ onSubmit, defaultValues }) {
  const { wikis } = useLoaderData() as { wikis: Array<Wiki> };
  const { handleSubmit, control } = useForm<FieldValues>({ defaultValues })

  const wikiOptions = _.map(wikis, (wiki) => {
    return {
      label: `${wiki.project} / ${wiki.language}`,
      value: wiki.id
    }
  })

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="Form"
    >
      <div className="FormRow">
        <GenericInput
          name="name"
          label="Topic Name"
          control={control}
          rules={{ required: 'A topic name is required' }}
        />

        <GenericInput
          name="slug"
          label="Topic Slug"
          control={control}
          rules={{ required: 'A topic slug is required' }}
          hint="A URL friendly version of your topic's name"
        />
      </div>

      <div className="FormRow">
        <TextAreaInput
          name="description"
          label="Topic Description"
          control={control}
          rules={{ required: 'A description is required' }}
          hint="A brief description of the Topic"
        />
      </div>

      <div className="FormRow">
        <SelectInput
          name="wiki_id"
          options={wikiOptions}
          label="Related Wiki Project"
          control={control}
        />

        <GenericInput
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
        <GenericInput
          name="timepoint_day_interval"
          label="Timepoint Day Interval"
          type='number'
          min={7}
          hint='The number of days between each analysis timepoint. Smaller values will provide greater analysis resolution but result in longer computation processes. 30 days is generally a good starting value.'
          control={control}
        />
      </div>

      <div className="FormRow">
        <FileInput
          name="users_csv"
          label="Users CSV"
          hint='A CSV file containing information related to topic Users'
          control={control}
        />

        <FileInput
          name="articles_csv"
          label="Articles CSV"
          hint='A CSV file containing information related to topic Articles'
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
  );
}

export default TopicForm;