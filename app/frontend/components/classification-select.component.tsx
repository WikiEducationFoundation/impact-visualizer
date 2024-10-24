// NPM
import React, { useState } from "react";
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

function ClassificationSelect({ stat, type, onChange, topic }: Props) {
  if (stat !== 'articles') return null;
  
  const options: Option[] = [
    { value: 'default', label: 'Overview' }
  ];
  
  const [selectedOption, setSelectedOption] = useState<Option>(options[0]);

  _.each(topic.classifications, (classification: Classification) => {
    options.push({
      value: `classification-${classification.id}`,
      label: `${classification.name} vs. Other`
    });

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