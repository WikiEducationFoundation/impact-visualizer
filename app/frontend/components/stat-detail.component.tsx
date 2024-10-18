import React from 'react';
import _ from 'lodash';
import cn from 'classnames';

import Topic from '../types/topic.type';
import StatFields from '../types/stat-fields.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import ChartTimepoint from '../types/chart-timepoint.type';

import Chart from './chart.component';
import ClassificationSelect from './classification-select.component';
import ChartUtils from '../utils/chart-utils';
import ChartSpec from '../utils/chart-spec';
import WikidataTranslator from '../utils/wikidata-translator';

interface Props {
  stat: string,
  fields: StatFields,
  topic: Topic,
  type: string,
  topicTimepoints: Array<TopicTimepoint>
};

function StatDetail({ topicTimepoints, fields, stat, type, topic }: Props) {
  const { totalField, deltaField, attributedDeltaField } = fields;

  if (topicTimepoints.length === 0) {
    return null;
  }

  // const wikidataTranslator = new WikidataTranslator()

  // wikidataTranslator.preload({
  //   qNumbers: ['Q5', 'Q6581072', 'Q1234567']
  // }).then((x) => {
  //   // console.log(x);
  //   // console.log(wikidataTranslator);
  //   console.log(wikidataTranslator.translate('Q5'));
  //   console.log(wikidataTranslator.translate('Q6581072'));
  //   console.log(wikidataTranslator.translate('Q1234567'));
  //   console.log(wikidataTranslator.translate('???'));
  // })

  let values: ChartTimepoint[] = [];
  let yLabel: string = '';
  let min: number = 0;
  let max: number = 0;
  let title: string = '';
  let categories: string[] = [];

  if (stat === 'wp10') {
    yLabel = 'Predicted Quality';
    title = `Predicted quality of articles over time`;
    const { values: vals, categories: cats } = ChartUtils.prepQualityValues({
      timepoints: topicTimepoints,
      topic
    });
    values = vals;
    categories = cats;
  } else {
    if (type === 'cumulative') {
      yLabel = _.startCase(totalField);
      title = `Cumulative change to ${_.lowerCase(totalField)}`;
      min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField);
      max = ChartUtils.maxForCumulativeChart(topicTimepoints, totalField);
      values = ChartUtils.prepCumulativeValues({
        timepoints: topicTimepoints,
        deltaField,
        totalField,
        attributedDeltaField
      });
    }
    if (type === 'delta') {
      yLabel = _.startCase(`${stat} Created`);
      title = `${_.startCase(stat)} created at each timepoint`;
      min = 0;
      max = ChartUtils.maxForDeltaChart(topicTimepoints, deltaField);
      values = ChartUtils.prepDeltaValues({
        timepoints: topicTimepoints,
        deltaField,
        totalField,
        attributedDeltaField
      });
    }
  }
  
  const spec = ChartSpec.prepare({
    values, yLabel, min, max, stat,
    type, timeUnit: topic.chart_time_unit 
  })

  return (
    <div
      className={cn({
        StatDetail: true,
      })}

      style={{
        border: '1px solid #e2e2e2'
      }}
    > 
      <div
        className="u-mb2"
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between'
        }}
      >
        {title &&
          <h2 className="u-mb0">
            {title}
          </h2>
        }
        <ClassificationSelect
          topic={topic}
          type={type}
          stat={stat}
          onChange={(x) => {
            console.log(x);
          }}
        />
      </div>
      <Chart
        spec={spec}
        categories={categories}
        stat={stat}
      />
    </div>
  );
}

export default StatDetail;