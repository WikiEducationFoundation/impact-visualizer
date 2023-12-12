import _ from 'lodash';

const ChartSpec = {
  prepare({ min, max, yLabel, values, stat, type, timeUnit }) {

    const axes = this.axes({ type, stat, yLabel });
    const marks = this.marks({ type, stat, yLabel });
    const data = this.data({ min, values, type, stat, timeUnit });
    const scales = this.scales({ min, max, type, stat});

    const spec = {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      description: "A Chart",
      autosize: {"type": "fit", "contains": "padding"},
      background: "white",
      padding: 0,
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
      axes: axes,
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
  },

  data({ min, values, type, stat, timeUnit }): object {
    if (stat === 'wp10') {
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
    }

    if (type === 'delta') {
      return [
        {
          name: 'data',
          values: values,
          transform: [
            { type: 'formula', expr: 'toDate(datum["date"])', as: 'date' },
            {
              type: 'timeunit',
              field: 'date',
              // maxbins: [10],
              units: [timeUnit],
              signal: 'tbin'
            },
            {
              type: 'aggregate',
              groupby: ['unit0', 'unit1', 'type'],
              ops: ['sum'],
              fields: ['value'],
              as: ['agg']
            },
            {
              type: 'stack',
              offset: 'zero',
              groupby: ['unit0'],
              field: 'agg',
              sort: { field: 'type' }
            }
          ]
        }
      ]  
    }

    return [
      {
        name: 'data',
        values: values,
        transform: [
          { type: 'formula', expr: 'toDate(datum["date"])', as: 'date' },
          {
            type: 'stack',
            offset: 'zero',
            groupby: ['date'],
            field: 'value',
            sort: { field: 'type' }
          },
          { type: 'formula', expr: `datum['y0'] + ${min}`, as: 'ya' },
          { type: 'formula', expr: `datum['y1'] + ${min}`, as: 'yb' },
        ]
      }
    ]
  },

  axes({ yLabel, type, stat }): object {
    if (type === 'delta') {
      return [
        { 
          scale: 'x',
          orient: 'bottom',
          title: 'Date',
          formatType: 'time'
        },
        { scale: 'y', orient: 'left', title: yLabel }
      ]
    }

    return [
      { scale: 'x', orient: 'bottom', title: 'Date'},
      { scale: 'y', orient: 'left', title: yLabel }
    ]
  },

  scales({ min, max, type, stat }): Array<object> {
    if (stat === 'wp10') {
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
    }

    if (type === 'delta') {
      return [
      {
        name: 'x',
        type: 'band',
        padding: 0.07,
        range: [0, { signal: 'width' }],
        domain: { signal: 'timeSequence(tbin.unit, tbin.start, tbin.stop)'}
      },
      {
        name: 'y',
        type: 'linear',
        domain: { data: 'data', field: 'y1' },
        range: [{signal: 'height'}, 0],
        zero: true
      },
      {
        name: 'color',
        type: 'ordinal',
        range: ['#676eb4', '#BFC4EE'],
        domain: { data: 'data', field: 'type' },
      }
    ]  
    }

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

  marks({ type, stat, yLabel }): Array<object> {
    if (stat == 'wp10') {
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
    }

    if (type === 'delta') {
      const time = "timeFormat(datum.unit0) + ' - ' + timeFormat(datum.unit1)";
      const title = `'${_.upperFirst(_.lowerCase(yLabel))}' + ' by ' + lower(datum.type)`;
      const tooltip = `{title: ${title}, Dates: ${time}, Count: format(datum.agg, ',')}`;
      return [
        {
          type: 'rect',
          from: { data: 'data'},    
          encode: {
            enter: {
              x: { scale: 'x', field: 'unit0' },
              // x2: { scale: 'x', field: 'unit1' },
              width: { scale: 'x', band: 1 },
              y: { scale: 'y', field: 'y0' },
              y2: { scale: 'y', field: 'y1' },
              fill: { scale: 'color', field: 'type' },
              tooltip: {
                signal: tooltip
              }
            },
            hover: {
              fillOpacity: {
                value: 0.9
              }
            }
          }
        }
      ]
    }

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
  }
}

export default ChartSpec;