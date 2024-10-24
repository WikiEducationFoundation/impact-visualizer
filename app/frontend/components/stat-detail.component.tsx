import React, { useCallback, useEffect, useState } from 'react';
import _ from 'lodash';
import cn from 'classnames';

import Topic from '../types/topic.type';
import StatFields from '../types/stat-fields.type';
import TopicTimepoint from '../types/topic-timepoint.type';

import Spinner from './spinner.component';
import Chart from './chart.component';
import ClassificationSelect from './classification-select.component';
import ChartUtils from '../utils/chart-utils';
import ChartSpec from '../utils/chart-spec';

interface Props {
  stat: string,
  fields: StatFields,
  topic: Topic,
  type: string,
  topicTimepoints: Array<TopicTimepoint>
};

function StatDetail({ topicTimepoints, fields, stat, type, topic }: Props) {
  const { totalField, deltaField, attributedDeltaField } = fields;
  const [loading, setLoading] = useState(true);
  const [classificationView, setClassificationView] = useState('default');
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [spec, setSpec] = useState({});

  if (topicTimepoints.length === 0) {
    return null;
  }

  const updateSpec = useCallback(async () => {
    setLoading(true);
    const { values, yLabel, min, max, categories, title } = 
      await ChartUtils.prepChartSpecs({ topicTimepoints, stat, totalField, topic,
                                  classificationView, deltaField,
                                  attributedDeltaField, type })
    
    const spec = ChartSpec.prepare({
      values, yLabel, min, max, stat, classificationView,
      categories, type, timeUnit: topic.chart_time_unit 
    });

    setTitle(title);
    setCategories(categories);
    setSpec(spec);
    setLoading(false);
  }, [classificationView, stat, topic, type])

  useEffect(() => {
    updateSpec();
  }, [classificationView, stat, topic, type]);

  useEffect(() => {
    setClassificationView('default');
  }, [stat, topic, type]);

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
          onChange={(classificationView) => {
            setClassificationView(classificationView.value);
          }}
        />
      </div>
      {loading &&
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 30
          }}
        >
          <Spinner />
        </div>
      }
      {!loading &&
        <Chart
          spec={spec}
          categories={categories}
          classificationView={classificationView}
          stat={stat}
        />
      }
    </div>
  );
}

export default StatDetail;