import _ from 'lodash';
import React, { useRef, useEffect } from 'react';
import vegaEmbed from 'vega-embed';
import * as vega from "vega";

function colorInterpolate(percent) {
  const color1 = "#FFFFFF";
  const color2 = "#3F479A";
  
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
  const color = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return color;
}

function Chart({ spec, categories, stat }) {
  const container = useRef<HTMLDivElement>(null);

  vega.scheme("wiki", colorInterpolate);

  if (stat === 'wp10') {
    const colors:string[] = [];
    _.each(categories, (category: string, index: number) => {
      if (category === 'Missing') {
        colors.push('#E4E4E4');
      };
      const percent = index / categories.length;
      const color = colorInterpolate(percent);
      colors.push(color);
    });
    vega.scheme("wp10", colors);
  };

  useEffect(() => {
    if (container) {
      vegaEmbed(
        container.current as HTMLDivElement,
        spec,
        { 
          renderer: 'svg',
          actions: false
        }
      )
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
        className="Chart"
        ref={container}
      />
    </div>
  );
}

export default Chart;
