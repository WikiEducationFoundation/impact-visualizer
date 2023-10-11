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

function StatDetail({ stat, topicTimepoints }: Props) {

  let total_field: string;
  let delta_field: string;
  let attributed_delta_field: string;

  switch(stat) {
    case 'articles':
      total_field = 'articles_count';
      delta_field = 'articles_count_delta';
      attributed_delta_field = 'attributed_articles_created_delta';
      break;
    case 'revisions':
      total_field = 'revisions_count';
      delta_field = 'revisions_count_delta';
      attributed_delta_field = 'attributed_revisions_count_delta';
      break;
    case 'length':
      total_field = 'length';
      delta_field = 'length_delta';
      attributed_delta_field = 'attributed_length_delta';
      break;
    case 'tokens':
      total_field = 'token_count';
      delta_field = 'token_count_delta';
      attributed_delta_field = 'attributed_token_count';
      break;
    case 'wp10':
      total_field = 'average_wp10_prediction';
      break;
    default:
      total_field = 'articles_count';
      delta_field = 'articles_count_delta';
      attributed_delta_field = 'attributed_articles_created_delta';
  }

  let min: number = _.reduce(topicTimepoints, (accum, topicTimepoint) => {
    return Math.min(accum as number, topicTimepoint[total_field] as number);
  }, topicTimepoints[0][total_field] as number);

  let max: number = _.reduce(topicTimepoints, (accum, topicTimepoint) => {
    return Math.max(accum as number, topicTimepoint[total_field] as number);
  }, topicTimepoints[0][total_field] as number);

  // const padding = max * .01;
  // min = Math.max(Math.round(min - padding), 0);
  // max = Math.round(max + padding);

  const startTotal = _.first(topicTimepoints)[total_field];
  let total = startTotal;
  let attributed = startTotal;

  const values: object = topicTimepoints.map((topicTimepoint) => {
    total = total + topicTimepoint[delta_field];
    attributed = attributed + topicTimepoint[attributed_delta_field]; 
    return {
      date: topicTimepoint.timestamp,
      total,
      attributed
    }
  })

  const spec = {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    description: "A Chart",
    autosize: {"type": "fit", "contains": "padding"},
    background: "white",
    padding: 20,
    style: "cell",
    data: [
      {
        "name": "data_0",
        "values": []
      },
      {
        "name": "data_1",
        "source": "data_0",
        transform: [
          {type: 'formula', expr: 'toDate(datum["date"])', as: 'date'}
        ]
      }
    ],
    signals: [
      {
        "name": "width",
        "init": "isFinite(containerSize()[0]) ? containerSize()[0] : 200",
        "on": [
          {
            "update": "isFinite(containerSize()[0]) ? containerSize()[0] : 200",
            "events": "window:resize"
          }
        ]
      },
      {
        "name": "height",
        "init": "isFinite(containerSize()[1]) ? containerSize()[1] : 200",
        "on": [
          {
            "update": "isFinite(containerSize()[1]) ? containerSize()[1] : 200",
            "events": "window:resize"
          }
        ]
      }
    ],
    marks: [
      {
        name: "total_marks",
        type: 'area',
        clip: true,
        from: { data: "data_1"},
        encode: {
          update: {
            interpolate: { value: 'basis'},
            fill: { value: '#676eb4'},
            x: {scale: 'x', field: 'date'},
            y: {scale: 'y', field: 'total'},
            y2: {scale: 'y', value: 0}
          }
        }
      },
      {
        name: 'attributed_marks',
        type: 'area',
        clip: true,
        from: { data: 'data_1'},
        encode: {
          update: {
            interpolate: { value: 'basis'},
            fill: { value: '#B3B5E9'},            
            x: { scale: 'x', field: 'date'},
            y: { scale: 'y', field: 'attributed'},
            y2: { scale: 'y', value: 0}
          }
        }
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'time',
        domain: {
          fields: [
            {data: 'data_1', field: 'date'}
          ]
        },
        range: [0, { signal: 'width' }]
      },
      {
        name: 'y',
        type: 'linear',
        domain: [min, max],
        range: [{signal: 'height'}, 0],
        zero: false
      }
    ],
    axes: [
      {
        "scale": "x",
        "orient": "bottom",
        title: 'Date'
      },
      {
        "scale": "y",
        "orient": "left",
        title: _.startCase(total_field)
      }
    ],  
    config: {
      axis: {
        labelColor: '#2c2c2c', 
        titleColor: '#2c2c2c',
        ticks: true,
        grid: true,
        labelFontSize: 12,
        titleFontSize: 12,
        titlePadding: 10
      },
      style: {
        'guide-label': { font: 'Open Sans'},
        'guide-title': { font: 'Open Sans'},
      }
    }
  }

  spec['data'][0]['values'] = values;


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