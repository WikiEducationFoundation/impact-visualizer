import React, { useState } from "react";
import _, { property } from 'lodash';
import cn from 'classnames';
import Select from 'react-select';

import Topic from '../types/topic.type';
import ChartUtils from '../utils/chart-utils';

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
  if (stat !== 'articles' || type !== 'delta') return null;
  
  const options: Option[] = [
    { value: 'total', label: 'Total' }
  ];
  
  const [selectedOption, setSelectedOption] = useState<Option>(options[0]);

  _.each(topic.classifications, (classification) => {
    options.push({
      value: `classification-${classification.id}`,
      label: `Total vs. ${classification.name}`
    });

    _.each(classification.properties, (property) => {
      if (property.segments === false) return;
      options.push({
        value: `property-${property.slug}`,
        label: `${classification.name} by ${property.name}`
      });
    });
  })

  const defaultOption = options[0];

  return (
    <Select
      className='Select'
      styles={{
        container: () => ({ width: 200, position: 'relative' })
      }}
      classNames={{
        control: () => 'Select-control'
      }}
      value={selectedOption}
      options={options}
      onChange={(selected) => {
        setSelectedOption(selected);
        onChange(selected);
      }}
    />
  );
}

export default ClassificationSelect;