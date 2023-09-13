import _ from 'lodash';
import React, { useRef, useEffect } from 'react';
import * as Vega from 'vega';

function Chart() {
  const container = useRef<HTMLDivElement>(null);

  const spec = {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "A basic line chart example.",
    "width": 800,
    "height": 200,
    "padding": 5,

    "data": [
      {
        "name": "table",
        "values": [
          {"x": 0, "y": 28, "c":0}, {"x": 0, "y": 20, "c":1},
          {"x": 1, "y": 43, "c":0}, {"x": 1, "y": 35, "c":1},
          {"x": 2, "y": 81, "c":0}, {"x": 2, "y": 10, "c":1},
          {"x": 3, "y": 19, "c":0}, {"x": 3, "y": 15, "c":1},
          {"x": 4, "y": 52, "c":0}, {"x": 4, "y": 48, "c":1},
          {"x": 5, "y": 24, "c":0}, {"x": 5, "y": 28, "c":1},
          {"x": 6, "y": 87, "c":0}, {"x": 6, "y": 66, "c":1},
          {"x": 7, "y": 17, "c":0}, {"x": 7, "y": 27, "c":1},
          {"x": 8, "y": 68, "c":0}, {"x": 8, "y": 16, "c":1},
          {"x": 9, "y": 49, "c":0}, {"x": 9, "y": 25, "c":1}
        ]
      }
    ],

    "scales": [
      {
        "name": "x",
        "type": "point",
        "range": "width",
        "domain": {"data": "table", "field": "x"}
      },
      {
        "name": "y",
        "type": "linear",
        "range": "height",
        "nice": true,
        "zero": true,
        "domain": {"data": "table", "field": "y"}
      },
      {
        "name": "color",
        "type": "ordinal",
        "range": "category",
        "domain": {"data": "table", "field": "c"}
      }
    ],

    "axes": [
      {"orient": "bottom", "scale": "x"},
      {"orient": "left", "scale": "y"}
    ],

    "marks": [
      {
        "type": "group",
        "from": {
          "facet": {
            "name": "series",
            "data": "table",
            "groupby": "c"
          }
        },
        "marks": [
          {
            "type": "line",
            "from": {"data": "series"},
            "encode": {
              "enter": {
                "x": {"scale": "x", "field": "x"},
                "y": {"scale": "y", "field": "y"},
                "stroke": {"scale": "color", "field": "c"},
                "strokeWidth": {"value": 4}
              },
              "update": {
                "interpolate": "linear",
                "strokeOpacity": {"value": 1}
              },
              "hover": {
                "strokeOpacity": {"value": 0.5}
              }
            }
          }
        ]
      }
    ]
  }

  useEffect(() => {
    if (container) {
      const view = new Vega.View(Vega.parse(spec), {
        renderer:  'svg',
        container: container.current as HTMLDivElement
      });
      view.runAsync();
    }
  }, []);


  return (
    <div>
      <div ref={container} />
    </div>
  );
}

export default Chart;