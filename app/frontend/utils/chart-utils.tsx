import _ from 'lodash';
import TopicUtils from './topic-utils';

import ChartTimepoint from '../types/chart-timepoint.type';
import TopicTimepoint from '../types/topic-timepoint.type';
import StatFields from '../types/stat-fields.type';

const ChartUtils = {
  categoryOrder: ['FA', 'FL', 'A', 'GA', 'B', 'C', 'Start', 'Stub', 'List', 'Missing'],

  parseClassificationViewKey(classificationView) {
    let classificationId: null | number = null;
    let propertySlug = '';
    
    if (classificationView !== 'default') {
      const classificationKeySegments = classificationView.split('::');
      classificationId = parseInt(classificationKeySegments[0].replace('classification-', ''));
      if (classificationKeySegments[1]) {
        propertySlug = classificationKeySegments[1].replace('property-', '');
      };
    };

    return { classificationId, propertySlug };
  },

  async prepChartSpecs({ topicTimepoints, stat, totalField, topic, classificationView,
                   deltaField, attributedDeltaField, type }) {
    
    let values: ChartTimepoint[] = [];
    let yLabel: string = '';
    let min: number = 0;
    let max: number = 0;
    let title: string = '';
    let categories: string[] = [];

    const {classificationId, propertySlug} =
      this.parseClassificationViewKey(classificationView);

    let fieldLabel = totalField;
    let statLabel = stat;

    if (stat === 'tokens' && topic.convert_tokens_to_words) {
      statLabel = 'words';
      fieldLabel = 'words';
    };

    if (stat === 'wp10') {
      yLabel = 'Predicted Quality';
      title = `Predicted quality of articles over time`;
      if (classificationId) {
        const { values: vals, categories: cats } = ChartUtils.prepClassificationQualityValues({
          timepoints: topicTimepoints,
          classificationId,
          topic
        });
        values = vals;
        categories = cats;
      } else {
        const { values: vals, categories: cats } = ChartUtils.prepQualityValues({
          timepoints: topicTimepoints,
          topic
        });
        values = vals;
        categories = cats;
      }
    } else {
      if (type === 'cumulative') {
        yLabel = _.startCase(fieldLabel);
        title = `Cumulative change to ${_.lowerCase(fieldLabel)}`;
        if (classificationView === 'default') {
          min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField, stat, topic);
          max = ChartUtils.maxForCumulativeChart(topicTimepoints, totalField, stat, topic);
          values = ChartUtils.prepCumulativeValues({
            timepoints: topicTimepoints,
            deltaField,
            totalField,
            attributedDeltaField,
            stat,
            topic
          });
        } else {
          if (propertySlug === '') {
            min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField, stat, topic);
            max = ChartUtils.maxForCumulativeChart(topicTimepoints, totalField, stat, topic);
            values = ChartUtils.prepClassificationTotalCumulativeValues({
              timepoints: topicTimepoints,
              deltaField,
              totalField,
              classificationId,
              propertySlug,
              stat,
              topic
            });
          } else {
            min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField, stat, topic);
            max = ChartUtils.maxForCumulativeSegmentChart(min, topicTimepoints, 
                                                          classificationId, propertySlug,
                                                          deltaField, stat, topic);
            const { values: vals, categories: cats } = ChartUtils.prepClassificationSegmentCumulativeValues({
              timepoints: topicTimepoints,
              deltaField,
              totalField,
              classificationId,
              propertySlug,
              stat,
              topic
            });
            values = vals;
            categories = cats;
          }
        }
      }
      if (type === 'delta') {
        yLabel = _.startCase(`${statLabel} Created`);
        title = `${_.startCase(statLabel)} created at each timepoint`;
        min = 0;
        max = ChartUtils.maxForDeltaChart(topicTimepoints, deltaField, stat, topic);
        if (classificationView === 'default') {
          values = ChartUtils.prepDeltaValues({
            timepoints: topicTimepoints,
            deltaField,
            totalField,
            attributedDeltaField,
            topic,
            stat
          });
        } else {
          if (propertySlug === '') {
            values = ChartUtils.prepClassificationTotalDeltaValues({
              timepoints: topicTimepoints,
              topic,
              deltaField,
              totalField,
              classificationId,
              propertySlug,
              stat
            });
          } else {
            const { values: vals, categories: cats } = ChartUtils.prepClassificationSegmentDeltaValues({
              timepoints: topicTimepoints,
              topic,
              deltaField,
              totalField,
              classificationId,
              propertySlug,
              stat
            });
            values = vals;
            categories = cats;
          }
        }
      }
    }

    return { values, yLabel, min, max, title, categories };
  },

  minForCumulativeChart(timepoints, totalField, stat, topic): number {
    let min = _.reduce(timepoints, (accum, timepoint) => {
      return Math.min(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);

    if (stat === 'tokens') {
      min = TopicUtils.tokenOrWordCount(topic, min);
    };

    return min;
  },

  maxForCumulativeChart(timepoints, totalField, stat, topic): number {
    let max = _.reduce(timepoints, (accum, timepoint) => {
      return Math.max(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);

    if (stat === 'tokens') {
      max = TopicUtils.tokenOrWordCount(topic, max);
    };

    return max;
  },

  maxForCumulativeSegmentChart(min, timepoints, classificationId, propertySlug, deltaField, stat, topic): number {
    let total = min;

    let classificationDeltaField = deltaField;
    if (classificationDeltaField === 'articles_count_delta') {
      classificationDeltaField = 'count_delta';
    };

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      const property = _.find(classification.properties, { slug: propertySlug });
      _.each(property.segments, (values) => {
        let value = values[classificationDeltaField];
        if (stat === 'tokens') {
          value = TopicUtils.tokenOrWordCount(topic, value);
        };
        total += value;
      })
    });

    return total;
  },

  maxForDeltaChart(timepoints, deltaField, stat, topic): number {
    const max:TopicTimepoint|undefined = _.maxBy(timepoints, (timepoint) => {
      return timepoint[deltaField] as number;
    });

    if (stat === 'tokens') {
      const count = TopicUtils.tokenOrWordCount(topic, max?.[deltaField]);
      return count;
    };

    return max?.[deltaField];
  },

  prepCumulativeValues(options): ChartTimepoint[] {
    const { timepoints, attributedDeltaField, deltaField, topic, stat } = options;
    
    const values: ChartTimepoint[] = [];

    let attributedCounter = 0;
    let unattributedCounter = 0;

    timepoints.forEach((timepoint) => {
      let attributed = timepoint[attributedDeltaField];
      let unattributed = timepoint[deltaField] - timepoint[attributedDeltaField];

      if (stat === 'tokens') {
        attributed = TopicUtils.tokenOrWordCount(topic, attributed);
        unattributed = TopicUtils.tokenOrWordCount(topic, unattributed);
      };

      attributedCounter += Math.max(0, attributed);
      unattributedCounter += Math.max(0, unattributed);

      values.push({
        date: timepoint.timestamp,
        value: unattributedCounter,
        type: 'Other editors'
      });

      values.push({
        date: timepoint.timestamp,
        value: attributedCounter,
        type: 'Our participants'
      });
    })

    return values;
  },

  prepDeltaValues(options): ChartTimepoint[] {
    const { timepoints, attributedDeltaField, deltaField, topic, stat } = options;

    const values: ChartTimepoint[] = [];

    timepoints.forEach((timepoint) => {
      let attributed = Math.max(0, timepoint[attributedDeltaField]);
      let unattributed = Math.max(0, timepoint[deltaField] - timepoint[attributedDeltaField]);

      if (stat === 'tokens') {
        attributed = TopicUtils.tokenOrWordCount(topic, attributed);
        unattributed = TopicUtils.tokenOrWordCount(topic, unattributed);
      };

      values.push({
        date: timepoint.timestamp,
        value: unattributed,
        type: 'Other editors'
      });

      values.push({
        date: timepoint.timestamp,
        value: attributed,
        type: 'Our participants'
      });
    })

    return values;
  },

  prepClassificationTotalCumulativeValues(options): ChartTimepoint[] {
    const { timepoints, classificationId, deltaField, stat, topic } = options;
    
    const values: ChartTimepoint[] = [];

    let classifiedCounter = 0;
    let unclassifiedCounter = 0;

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      
      let classified = classification.count_delta;
      let unclassified = timepoint[deltaField] - classification.count_delta;

      if (stat === 'tokens') {
        classified = TopicUtils.tokenOrWordCount(topic, classified);
        unclassified = TopicUtils.tokenOrWordCount(topic, unclassified);
      };

      classifiedCounter += Math.max(0, classified);
      unclassifiedCounter += Math.max(0, unclassified);

      values.push({
        date: timepoint.timestamp,
        value: classifiedCounter,
        type: classification.name
      });

      values.push({
        date: timepoint.timestamp,
        value: unclassifiedCounter,
        type: 'Other'
      });

    })

    return values;
  },

  prepClassificationTotalDeltaValues(options): ChartTimepoint[] {
    const { timepoints, deltaField, classificationId, stat, topic } = options;
    
    const values: ChartTimepoint[] = [];
    let classificationDeltaField = deltaField;
    if (classificationDeltaField === 'articles_count_delta') {
      classificationDeltaField = 'count_delta';
    };

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      let classified = Math.max(0, classification[classificationDeltaField]);
      let unclassified = Math.max(0, timepoint[deltaField] - classification[classificationDeltaField]);

      if (stat === 'tokens') {
        classified = TopicUtils.tokenOrWordCount(topic, classified);
        unclassified = TopicUtils.tokenOrWordCount(topic, unclassified);
      };

      values.push({
        date: timepoint.timestamp,
        value: classified,
        type: classification.name
      });
      
      values.push({
        date: timepoint.timestamp,
        value: unclassified,
        type: 'Other'
      });
    })

    return values;
  },

  prepClassificationSegmentDeltaValues(options): {values: ChartTimepoint[], categories: string[]} {
    const { timepoints, classificationId, propertySlug,
            deltaField, stat, topic } = options;

    const values: Array<ChartTimepoint> = [];
    let segments: Array<{key: string, countDelta: number, label: string}> = [];

    let classificationDeltaField = deltaField;
    if (classificationDeltaField === 'articles_count_delta') {
      classificationDeltaField = 'count_delta';
    };

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      const property = _.find(classification.properties, { slug: propertySlug });
      _.each(property.segments, (values, key) => {
        const existingSegment = _.find(segments, { key });
        if (existingSegment) {
          existingSegment.countDelta += values[classificationDeltaField];
        } else {
          segments.push({
            key: key,
            countDelta: values[classificationDeltaField],
            label: values.label
          });
        }
      })
    });

    segments = _.sortBy(segments, (segment) => {
      if (segment.key === 'other') {
        return 100000;
      }
      return -segment.countDelta;
    });


    if (segments.length > 20) {
      const otherSegment = _.find(segments, { key: 'other'});
      if (otherSegment) {
        segments = _.reject(segments, otherSegment);
      }
      segments = _.take(segments, 19);
      if (otherSegment) {
        segments.push(otherSegment);
      };
    };

    timepoints.forEach((timepoint) => {
      _.each(segments, (segment) => {
        let value = 0;
        const classification = _.find(timepoint.classifications, { id: classificationId });
        const property = _.find(classification.properties, { slug: propertySlug });
        const segmentValues = property.segments[segment.key];
        const type = segmentValues.label;
        if (segmentValues && segmentValues[classificationDeltaField]) {
          value = segmentValues[classificationDeltaField];
        };
        if (stat === 'tokens') {
          value = TopicUtils.tokenOrWordCount(topic, value);
        };
        values.push({
          date: timepoint.timestamp,
          value,
          type
        });
      });
    });

    const categories: Array<string> = _.map(segments, 'label');
    return { categories, values };
  },

  prepClassificationSegmentCumulativeValues(options): { values: ChartTimepoint[], categories: string[] } {
    const { timepoints, classificationId, propertySlug, deltaField, topic, stat } = options;

    const values: Array<ChartTimepoint> = [];
    let segments: Array<{key: string, countDelta: number, counter: number, label: string}> = [];

    let classificationDeltaField = deltaField;
    if (classificationDeltaField === 'articles_count_delta') {
      classificationDeltaField = 'count_delta';
    };

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      const property = _.find(classification.properties, { slug: propertySlug });
      _.each(property.segments, (values, key) => {
        const existingSegment = _.find(segments, { key });
        if (existingSegment) {
          existingSegment.countDelta += values[classificationDeltaField];
        } else {
          segments.push({
            key: key,
            countDelta: values[classificationDeltaField],
            label: values.label,
            counter: 0
          });
        }
      })
    });

    segments = _.sortBy(segments, (segment) => {
      return -segment.countDelta;
    })

    if (segments.length > 20) {
      const otherSegment = _.find(segments, { key: 'other'});
      if (otherSegment) {
        segments = _.reject(segments, otherSegment);
      }
      segments = _.take(segments, 19);
      if (otherSegment) {
        segments.push(otherSegment);
      };
    };

    timepoints.forEach((timepoint) => {
      _.each(segments, (segment) => {
        let value = 0;
        const classification = _.find(timepoint.classifications, { id: classificationId });
        const property = _.find(classification.properties, { slug: propertySlug });
        const segmentValues = property.segments[segment.key];
        const type = segmentValues.label;

        let segmentValue = segmentValues[classificationDeltaField];

        if (stat === 'tokens') {
          segmentValue = TopicUtils.tokenOrWordCount(topic, segmentValue);
        };

        segment.counter += Math.max(0, segmentValue);
        value = segment.counter;

        values.push({
          date: timepoint.timestamp,
          value,
          type
        });
      });
    });

    const categories: Array<string> = _.map(segments, 'label');
    return { categories, values };
  },

  prepQualityValues(options): { values: ChartTimepoint[], categories: string[] } {
    const { timepoints, topic } = options;

    const values: Array<ChartTimepoint> = [];
    let categories: Array<string> = [];
    
    categories.push('Missing');

    timepoints.forEach((timepoint) => {
      categories.push(..._.keys(timepoint.wp10_prediction_categories));
    })

    categories = _.uniq(categories);
    categories = _.without(categories, '');
    categories = _.sortBy(categories, (category) => {
      const index = _.indexOf(this.categoryOrder, category);
      return index;
    });

    timepoints.forEach((timepoint) => {
      categories.forEach((category) => {
        if (category === 'Missing') {
          const missingCount = topic.articles_count - timepoint.articles_count;
          values.push({
            date: timepoint.timestamp,
            count: missingCount,
            category: category,
            categoryIndex: _.indexOf(this.categoryOrder, category)
          });
          return;
        };

        values.push({
          date: timepoint.timestamp,
          count: timepoint.wp10_prediction_categories[category] || 0,
          category: category,
          categoryIndex: _.indexOf(this.categoryOrder, category)
        });
      })
    })

    return { categories, values };
  },

  prepClassificationQualityValues(options): { values: ChartTimepoint[], categories: string[] } {
    const { timepoints, topic, classificationId } = options;

    const values: Array<ChartTimepoint> = [];
    let categories: Array<string> = [];

    const total = _.get(_.find(topic.classifications, { id: classificationId }), 'count');

    categories.push('Missing');

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      categories.push(..._.keys(classification.wp10_prediction_categories));
    })

    categories = _.uniq(categories);
    categories = _.without(categories, '');
    categories = _.sortBy(categories, (category) => {
      const index = _.indexOf(this.categoryOrder, category);
      return index;
    });

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      categories.forEach((category) => {
        if (category === 'Missing') {
          const missingCount = total - classification.count;
          values.push({
            date: timepoint.timestamp,
            count: missingCount,
            category: category,
            categoryIndex: _.indexOf(this.categoryOrder, category)
          });
          return;
        };

        values.push({
          date: timepoint.timestamp,
          count: classification.wp10_prediction_categories[category] || 0,
          category: category,
          categoryIndex: _.indexOf(this.categoryOrder, category)
        });
      })
    })

    return { categories, values };
  },

  fieldsForStat(stat: String): StatFields {
    if (stat === 'articles') {
      return {
        totalField: 'articles_count',
        deltaField: 'articles_count_delta',
        attributedDeltaField: 'attributed_articles_created_delta'
      }
    }

    if (stat === 'revisions') {
      return {
        totalField: 'revisions_count',
        deltaField: 'revisions_count_delta',
        attributedDeltaField: 'attributed_revisions_count_delta'
      }
    }

    if (stat == 'length') {
      return {
        totalField: 'length',
        deltaField: 'length_delta',
        attributedDeltaField: 'attributed_length_delta'
      }
    }
    
    if (stat == 'tokens') {
      return {
        totalField: 'token_count',
        deltaField: 'token_count_delta',
        attributedDeltaField: 'attributed_token_count'
      }
    }
    
    return {
      totalField: 'average_wp10_prediction',
      deltaField: 'articles_count_delta',
      attributedDeltaField: 'attributed_articles_created_delta',
    }
  }
}

export default ChartUtils;