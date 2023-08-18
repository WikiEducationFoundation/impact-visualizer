import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

type TopicType = {
  id: number,
  name: string,
  slug: string,
  start_date: string,
  timepoint_day_interval: number
}

function Topic({ topic }: { topic: TopicType }) {
  return (
    <div>
      <h3>
        {topic.name}
      </h3>
      <ul>
        <li>
          ID: {topic.id}
        </li>
        <li>
          Slug: {topic.slug}
        </li>
        <li>
          Start Date: {topic.start_date}
        </li>
        <li>
          Timepoint interval: {topic.timepoint_day_interval}
        </li>
      </ul>
    </div>
  );
}

function App() {
  const [topics, setTopics] = useState<Array<TopicType>>([]);

  useEffect(() => {
    axios.get('http://localhost:3000/topics')
      .then(response => {
        setTopics(_.get(response, 'data.topics'));
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  return (
    <div>
      {topics.map(topic => (
        <Topic key={topic.id} topic={topic} />
      ))}
    </div>
  );
}

export default App;