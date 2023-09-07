import _ from 'lodash';
import React from 'react';

import TopicIndex from './topic-index.component';

function Home() {
  return (
    <section className="Section">
      <div className="Container Container--padded">
        <TopicIndex />
      </div>
    </section>
  );
}

export default Home;