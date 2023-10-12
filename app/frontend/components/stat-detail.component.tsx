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

  const min: number = _.reduce(topicTimepoints, (accum, topicTimepoint) => {
    return Math.min(accum as number, topicTimepoint[total_field] as number);
  }, topicTimepoints[0][total_field] as number);

  const max: number = _.reduce(topicTimepoints, (accum, topicTimepoint) => {
    return Math.max(accum as number, topicTimepoint[total_field] as number);
  }, topicTimepoints[0][total_field] as number);

  const startTotal = _.first(topicTimepoints)[total_field];
  let attributedCounter = 0;
  let unattributedCounter = 0;

  const values = [];

  topicTimepoints.forEach((topicTimepoint) => {
    attributedCounter += Math.max(0, topicTimepoint[attributed_delta_field]);
    unattributedCounter += Math.max(0, topicTimepoint[delta_field] - topicTimepoint[attributed_delta_field]);

    values.push({
      date: topicTimepoint.timestamp,
      value: unattributedCounter,
      type: 'unattributed'
    });

    values.push({
      date: topicTimepoint.timestamp,
      value: attributedCounter,
      type: 'attributed'
    });
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
        name: 'data',
        values: [],
        transform: [
          {type: 'formula', expr: 'toDate(datum["date"])', as: 'date'},
          {
            type: 'stack',
            offset: 'zero',
            groupby: ['date'],
            field: 'value',
            sort: { field: 'type' }
          },
          {type: 'formula', expr: `datum['y0'] + ${min}`, as: 'ya'},
          {type: 'formula', expr: `datum['y1'] + ${min}`, as: 'yb'},
        ]
      }
    ],
    signals: [
      {
        name: 'width',
        init: 'isFinite(containerSize()[0]) ? containerSize()[0] : 200',
        on: [
          {
            update: 'isFinite(containerSize()[0]) ? containerSize()[0] : 200',
            events: 'window:resize'
          }
        ]
      },
      {
        name: 'height',
        init: 'isFinite(containerSize()[1]) ? containerSize()[1] : 200',
        on: [
          {
            update: 'isFinite(containerSize()[1]) ? containerSize()[1] : 200',
            events: 'window:resize'
          }
        ]
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'time',
        domain: {data: 'data', field: 'date'},
        range: [0, { signal: 'width' }]
      },
      {
        name: 'y',
        type: 'linear',
        domain: [min, max],
        // domain: {data: 'data', field: 'y1'},
        range: [{signal: 'height'}, 0],
        zero: false
      },
      {
        name: 'color',
        type: 'ordinal',
        range: 'category',
        domain: { data: 'data', field: 'type' }
      }
    ],
    axes: [
      { scale: 'x', orient: 'bottom', title: 'Date'},
      { scale: 'y', orient: 'left', title: _.startCase(total_field) }
    ],
    marks: [
      {
        type: 'group',
        clip: true,
        from: {
          facet: {
            name: 'facet',
            data: 'data',
            groupby: 'type'
          }
        },
        marks: [
          {
            type: 'area',
            clip: false,
            from: { data: 'facet'},
            encode: {
              enter: {
                interpolate: { value: 'basis'},
                x: { scale: 'x', field: 'date' },
                y: { scale: 'y', field: 'ya' },
                y2: { scale: 'y', field: 'yb' },
                fill: { scale: 'color', field: 'type' }
              }
            }        
          },
        ]
      }
    ],
    legends: [
      {
        fill: 'color'
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