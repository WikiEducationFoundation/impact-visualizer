// NPM
import React from 'react';
import cn from 'classnames';

function Spinner({ size = 'large' }) {
  return (
    <div
      className={cn({
        'Spinner': true,
        [`Spinner--${size}`]: true
      })}
    />
  );
}

export default Spinner;