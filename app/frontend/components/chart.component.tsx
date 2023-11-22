import _ from 'lodash';
import React, { useRef, useEffect } from 'react';
import vegaEmbed from 'vega-embed';
import * as vega from "vega";

function colorInterpolate(percent) {
  const color1 = "#3F479A";
  const color2 = "#FFFFFF";
  
  // Convert the hex colors to RGB values
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  // Interpolate the RGB values
  const r = Math.round(r1 + (r2 - r1) * percent);
  const g = Math.round(g1 + (g2 - g1) * percent);
  const b = Math.round(b1 + (b2 - b1) * percent);

  // Convert the interpolated RGB values back to a hex color
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function Chart({ spec }) {
  const container = useRef<HTMLDivElement>(null);

  vega.scheme("wiki", colorInterpolate);

  useEffect(() => {
    if (container) {
      vegaEmbed(container.current, spec, { renderer: 'svg', actions: false })
        .then(() => {
        })
        .catch((e) => {
          console.log(e);
        })
    }
  });


  return (
    <div>
      <div
        style={{
          width: '100%',
          height: 450,
          border: '1px solid #e2e2e2'
        }}
        ref={container}
      />
    </div>
  );
}

export default Chart;