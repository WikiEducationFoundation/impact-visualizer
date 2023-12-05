import _ from 'lodash';

const ChartSpec = {
  data(min, values): object {
    return [
      {
        name: 'data',
        values: values,
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
    ]
  },

  qualityData(values): object {
    return [
      {
        name: 'data',
        values: values,
        transform: [
          { type: 'formula', expr: 'toDate(datum["date"])', as: 'date' },
          {
            type: 'stack',
            groupby: ['date'],
            field: 'count',
            sort: { field: 'categoryIndex', order: 'descending' }
          },
        ]
      }
    ];
  },

  scales(min, max): Array<object> {
    return [
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
        range: [{signal: 'height'}, 0],
        zero: false
      },
      {
        name: 'color',
        type: 'ordinal',
        range: ['#676eb4', '#BFC4EE'],
        domain: { data: 'data', field: 'type' },
      }
    ]
  },

  qualityScales(): Array<object> {
    return [
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
        range: { scheme: "wiki" },
        domain: {data: 'data', field: 'category'}
      }
    ]
  },

  marks(): Array<object> {
    return [
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
    ]
  },

  qualityMarks(): Array<object> {
    return [
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
                fill: { 
                  scale: 'color', 
                  field: 'category'
                }
              }
            }        
          },
        ]
      }
    ]
  },

  prepare({min, max, yLabel, values, stat}) {
    let data: object;
    let scales: Array<object>;
    let marks: Array<object>;

    if (stat === 'wp10') {
      data = this.qualityData(values);
      scales = this.qualityScales();
      marks = this.qualityMarks();
    } else {
      data = this.data(min, values);
      scales = this.scales(min, max);
      marks = this.marks();
    }

    const spec = {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      description: "A Chart",
      autosize: {"type": "fit", "contains": "padding"},
      background: "white",
      padding: 20,
      style: "cell",
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
      axes: [
        { scale: 'x', orient: 'bottom', title: 'Date'},
        { scale: 'y', orient: 'left', title: yLabel }
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
      },
      data,
      scales,
      marks
    }

    return spec;
  }
}

export default ChartSpec;