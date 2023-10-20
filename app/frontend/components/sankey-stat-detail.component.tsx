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

function SankeyStatDetail({ stat, topicTimepoints }: Props) {
  const values = [];
  let categories = [];

  topicTimepoints.forEach((topicTimepoint) => {
    categories.push(..._.keys(topicTimepoint.wp10_prediction_categories));
  })

  categories = _.uniq(categories);

  topicTimepoints.forEach((topicTimepoint) => {
    categories.forEach((category) => {
      values.push({
        date: topicTimepoint.timestamp,
        count: topicTimepoint.wp10_prediction_categories[category] || 0,
        category: category
      });
    })
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
            groupby: ['date'],
            field: 'count',
            sort: { field: 'category', order: 'descending' }
          },
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
        range: [0, { signal: 'width' }],
        domain: { data: 'data', field: 'date' }
      },
      {
        name: 'y',
        type: 'linear',
        range: [{signal: 'height'}, 0],
        domain: { data: 'data', field: 'y1' }
      },
      {
        name: "color",
        type: "ordinal",
        range: "category",
        domain: {data: 'data', field: 'category'}
      }
    ],
    axes: [
      { scale: 'x', orient: 'bottom', title: 'Date'},
      { scale: 'y', orient: 'left', title: 'Predicted wp10 Categories' }
    ],
    marks: [
      {
        type: 'group',
        clip: true,
        from: {
          facet: {
            name: 'facet',
            data: 'data',
            groupby: 'category'
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
                y: { scale: 'y', field: 'y0' },
                y2: { scale: 'y', field: 'y1' },
                fill: { scale: 'color', field: 'category' }
              }
            }        
          },
        ]
      }
    ],
    legends: [
      {
        fill: 'color',
        labelFontSize: 12
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
        SankeyStatDetail: true,
      })}
    >
      <Chart
        spec={spec}
      />
    </div>
  );
}

export default SankeyStatDetail;