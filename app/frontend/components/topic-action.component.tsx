// NPM
import _ from 'lodash';
import React from 'react';
import cn from 'classnames';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Types
import Topic from '../types/topic.type';

// Misc
import TopicService from '../services/topic.service';

const actions = {
  articles: {
    label: 'Articles',
    buttonLabel: 'Import Articles',
    isReady: (topic: Topic) => {
      return !!topic.articles_csv_filename;
    },
    isBusy: (topic: Topic) => {
      return topic.articles_import_status !== 'idle';
    },
    status: (topic: Topic) => {
      return topic.articles_import_status;
    },
    progress: (topic: Topic) => {
      return topic.articles_import_percent_complete;
    },
    renderNotReady: (topic: Topic) => {
      return (
        <span>
          You must
          {' '}
          <Link
            className="u-bottomBorder"
            to={`/my-topics/edit/${topic.id}`}>attach a CSV file
          </Link>
          {' '}
          containing Articles data before importing.
        </span>
      );
    },
    mutationFn: TopicService.import_articles
  },
  users: {
    label: 'Users',
    buttonLabel: 'Import Users',
    isReady: (topic: Topic) => {
      return !!topic.users_csv_filename;
    },
    isBusy: (topic: Topic) => {
      return topic.users_import_status !== 'idle';
    },
    status: (topic: Topic) => {
      return topic.users_import_status;
    },
    progress: (topic: Topic) => {
      return topic.users_import_percent_complete;
    },
    renderNotReady: (topic: Topic) => { 
      return (
        <span>
          You must <Link className="u-bottomBorder" to={`/my-topics/edit/${topic.id}`}>attach a CSV file</Link> containing Users data before importing.
        </span>
      );
    },
    mutationFn: TopicService.import_users
  },
  timepoints: {
    label: 'Timepoints',
    buttonLabel: 'Generate Timepoints',
    isReady: (topic: Topic) => {
      return topic.user_count > 0 && topic.articles_count > 0;
    },
    isBusy: (topic: Topic) => {
      return topic.timepoint_generate_status !== 'idle';
    },
    status: (topic: Topic) => {
      return topic.timepoint_generate_status;
    },
    progress: (topic: Topic) => {
      return topic.timepoint_generate_percent_complete;
    },
    renderNotReady: () => {
      return (
        <span>You must import Users and Articles before generating timepoints</span>
      );
    },
    mutationFn: TopicService.generate_timepoints
  }
}

function TopicAction({ topic, actionKey }) {
  const queryClient = useQueryClient()
  const action = actions[actionKey];
  const timepoints = actionKey === 'timepoints';

  const mutation = useMutation({
    mutationFn: (params) => action.mutationFn(topic.id, params),
    onSuccess: (data) => {
      queryClient.setQueryData(['topic', topic.id.toString()], data);
    },
    onError: (error) => {
      console.log(error);
    }
  })
  
  const isReady = action.isReady(topic);
  const isBusy = action.isBusy(topic);
  const status = action.status(topic);
  const progress = action.progress(topic);

  return (
    <div className="TopicAction">
      <h4>{action.label}</h4>
      {(isReady && !isBusy) &&
        <>
          <button
            className="Button Button--outlined"
            onClick={() => mutation.mutate()}
          >
            {action.buttonLabel} {timepoints && '(updates only)'}
          </button>

          {timepoints &&
            <div className='u-mt05'>
              <button
                className="Button Button--outlined"
                onClick={() => mutation.mutate({ force_updates: true })}
              >
                {action.buttonLabel} (refresh all)
              </button>
            </div>
          }
        </>
      }

      {(isReady && isBusy) &&
        <div className="TopicAction-statusAndProgress">
          <span
            className={cn({
              "TopicActionStatus": true,
              [`TopicActionStatus--${status}`]: true,
            })}
          >
            {status}
          </span>
          <span className="u-ml05 TopicAction-progress">
            {progress}%
          </span>
        </div>
      }

      {!isReady && action.renderNotReady(topic)}
    </div>
  );
}

export default TopicAction;