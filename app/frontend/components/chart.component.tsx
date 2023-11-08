import _ from 'lodash';
import React, { useRef, useEffect } from 'react';
import vegaEmbed from 'vega-embed';

function Chart({ spec }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container) {
      vegaEmbed(container.current, spec, { renderer: 'svg' })
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
          height: 450
        }}
        ref={container}
      />
    </div>
  );
}

export default Chart;