import React, { MouseEventHandler } from 'react';
import _ from 'lodash';
import cn from 'classnames';

import Topic from '../types/topic.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import Chart from './chart.component';

interface Props {
  stat: string,
  topic: Topic,
  topicTimepoints: Array<TopicTimepoint>
};

function StatDetail({ stat, topic, topicTimepoints }: Props) {

  let field = null;

  switch(stat) {
    case 'articles':
      field = 'articles_count';
      break;
    case 'revisions':
      field = 'revisions_count';
      break;
    case 'length':
      field = 'length';
      break;
    case 'tokens':
      field = 'token_count';
      break;
    case 'wp10':
      field = 'average_wp10_prediction';
      break;
    default:
      field = 'articles_count';
  }

  const spec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    description: "A Chart",
    width: "container",
    height: "container",
    padding: 20,
    data: { "values": [] },
    mark: {
      type: "line",
      color: '#676eb4',
      point: {
        filled: false,
        fill: 'white',
        color: '#676eb4'
      }
    },
    encoding: {
      x: {
        field: "date",
        type: "temporal",
        title: 'Date'
      },
      y: {
        field: field,
        type: "quantitative",
        title: _.startCase(field),
        // scale: {
        //   domain: [0, 100]
        // }
      }
    }
  }

  const values = topicTimepoints.map((topicTimepoint) => {
    return {
      date: topicTimepoint.timestamp,
      [field]: topicTimepoint[field]
    }
  })

  spec['data']['values'] = values;

  return (
    <div
      className={cn({
        StatDetail: true,
      })}
    >
      <Chart
        spec={spec}
      />
    </div>
  );
}

export default StatDetail;