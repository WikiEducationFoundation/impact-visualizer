import _ from 'lodash';
import ChartTimepoint from '../types/chart-timepoint.type';
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
        yLabel = _.startCase(totalField);
        title = `Cumulative change to ${_.lowerCase(totalField)}`;
        if (classificationView === 'default') {
          min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField);
          max = ChartUtils.maxForCumulativeChart(topicTimepoints, totalField);
          values = ChartUtils.prepCumulativeValues({
            timepoints: topicTimepoints,
            deltaField,
            totalField,
            attributedDeltaField
          });
        } else {
          if (propertySlug === '') {
            min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField);
            max = ChartUtils.maxForCumulativeChart(topicTimepoints, totalField);
            values = ChartUtils.prepClassificationTotalCumulativeValues({
              timepoints: topicTimepoints,
              deltaField,
              totalField,
              classificationId,
              propertySlug
            });
          } else {
            min = ChartUtils.minForCumulativeChart(topicTimepoints, totalField);
            max = ChartUtils.maxForCumulativeSegmentChart(min, topicTimepoints, 
                                                          classificationId, propertySlug, deltaField);
            const { values: vals, categories: cats } = ChartUtils.prepClassificationSegmentCumulativeValues({
              timepoints: topicTimepoints,
              deltaField,
              totalField,
              classificationId,
              propertySlug
            });
            values = vals;
            categories = cats;
          }
        }
      }
      if (type === 'delta') {
        yLabel = _.startCase(`${stat} Created`);
        title = `${_.startCase(stat)} created at each timepoint`;
        min = 0;
        max = ChartUtils.maxForDeltaChart(topicTimepoints, deltaField);
        if (classificationView === 'default') {
          values = ChartUtils.prepDeltaValues({
            timepoints: topicTimepoints,
            deltaField,
            totalField,
            attributedDeltaField
          });
        } else {
          if (propertySlug === '') {
            values = ChartUtils.prepClassificationTotalDeltaValues({
              timepoints: topicTimepoints,
              topic,
              deltaField,
              totalField,
              classificationId,
              propertySlug
            });
          } else {
            const { values: vals, categories: cats } = ChartUtils.prepClassificationSegmentDeltaValues({
              timepoints: topicTimepoints,
              topic,
              deltaField,
              totalField,
              classificationId,
              propertySlug
            });
            values = vals;
            categories = cats;
          }
        }
      }
    }

    return { values, yLabel, min, max, title, categories };
  },

  minForCumulativeChart(timepoints, totalField): number {
    return _.reduce(timepoints, (accum, timepoint) => {
      return Math.min(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);
  },

  maxForCumulativeChart(timepoints, totalField): number {
    return _.reduce(timepoints, (accum, timepoint) => {
      return Math.max(accum as number, timepoint[totalField] as number);
    }, timepoints[0][totalField] as number);
  },

  maxForCumulativeSegmentChart(min, timepoints, classificationId, propertySlug, deltaField): number {
    let total = min;

    let classificationDeltaField = deltaField;
    if (classificationDeltaField === 'articles_count_delta') {
      classificationDeltaField = 'count_delta';
    };

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      const property = _.find(classification.properties, { slug: propertySlug });
      _.each(property.segments, (values) => {
        total += values[classificationDeltaField];
      })
    });

    return total;
  },

  maxForDeltaChart(timepoints, deltaField): number {
    const max = _.maxBy(timepoints, (timepoint) => {
      return timepoint[deltaField] as number;
    });
    return max[deltaField]
  },

  prepCumulativeValues(options): ChartTimepoint[] {
    const { timepoints, attributedDeltaField, deltaField } = options;
    
    const values: ChartTimepoint[] = [];

    let attributedCounter = 0;
    let unattributedCounter = 0;

    timepoints.forEach((timepoint) => {
      attributedCounter += Math.max(0, timepoint[attributedDeltaField]);
      unattributedCounter += Math.max(0, timepoint[deltaField] - timepoint[attributedDeltaField]);

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
    const { timepoints, attributedDeltaField, deltaField } = options;

    const values: ChartTimepoint[] = [];

    timepoints.forEach((timepoint) => {
      const attributed = Math.max(0, timepoint[attributedDeltaField]);
      const unattributed = Math.max(0, timepoint[deltaField] - timepoint[attributedDeltaField]);

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
    const { timepoints, classificationId, deltaField } = options;
    
    const values: ChartTimepoint[] = [];

    let classifiedCounter = 0;
    let unclassifiedCounter = 0;

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      classifiedCounter += Math.max(0, classification.count_delta);
      unclassifiedCounter += Math.max(0, timepoint[deltaField] - classification.count_delta);

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
    const { timepoints, deltaField, classificationId } = options;
    
    const values: ChartTimepoint[] = [];
    let classificationDeltaField = deltaField;
    if (classificationDeltaField === 'articles_count_delta') {
      classificationDeltaField = 'count_delta';
    };

    timepoints.forEach((timepoint) => {
      const classification = _.find(timepoint.classifications, { id: classificationId });
      const classified = Math.max(0, classification[classificationDeltaField]);
      const unclassified = Math.max(0, timepoint[deltaField] - classification[classificationDeltaField]);

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
    const { timepoints, classificationId, propertySlug, deltaField } = options;

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
      return -segment.countDelta;
    })

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
    const { timepoints, classificationId, propertySlug, deltaField } = options;

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

    timepoints.forEach((timepoint) => {
      _.each(segments, (segment) => {
        let value = 0;
        const classification = _.find(timepoint.classifications, { id: classificationId });
        const property = _.find(classification.properties, { slug: propertySlug });
        const segmentValues = property.segments[segment.key];
        const type = segmentValues.label;

        segment.counter += Math.max(0, segmentValues[classificationDeltaField]);
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