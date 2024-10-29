// NPM
import React, { useState, useEffect } from "react";
import _ from 'lodash';
import Select from 'react-select';

// Types
import Topic from '../types/topic.type';
import Classification from '../types/classification.type';

interface Props {
  stat: string,
  topic: Topic,
  type: string,
  onChange: Function
};

type Option = {
  value: String | Number,
  label: String
}

const stats = ['articles', 'revisions', 'tokens', 'wp10']

function ClassificationSelect({ stat, type, onChange, topic }: Props) {
  if (!_.includes(stats, stat)) return null;
  if (!topic.classifications) return null;
  if (topic.classifications.length === 0) return null;

  const options: Option[] = [
    { value: 'default', label: 'Overview' }
  ];

  const [selectedOption, setSelectedOption] = useState<Option>(options[0]);

  useEffect(() => {
    setSelectedOption(options[0]);
  }, [stat, topic, type]);

  _.each(topic.classifications, (classification: Classification) => {
    let label = `${classification.name} vs. Other`;
    if (stat === 'wp10') {
      label = classification.name;
    };
    options.push({
      value: `classification-${classification.id}`,
      label
    });

    if (stat === 'wp10') return;
    
    _.each(classification.properties, (property) => {
      if (property.segments === false) return;
      options.push({
        value: `classification-${classification.id}::property-${property.slug}`,
        label: `${classification.name} by ${property.name}`
      });
    });
  })

  return (
    <Select
      className='Select'
      styles={{
        container: () => ({ width: 200, position: 'relative' }),
        menuList: () => ({ fontSize: 14 })
      }}
      classNames={{
        control: () => 'Select-control'
      }}
      value={selectedOption}
      options={options}
      onChange={(selected) => {
        if (selected) {
          setSelectedOption(selected);
          onChange(selected);
        }
      }}
    />
  );
}

export default ClassificationSelect;