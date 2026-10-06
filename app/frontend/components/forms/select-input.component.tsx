import _ from 'lodash';
import React from 'react';
import Select from 'react-select';
import { UseControllerProps, useController, FieldValues } from 'react-hook-form';

type Option = {
  value: String | Number,
  label: String
}

type Props = {
  label: String,
  options: Array<Option>,
  hint?: String,
  isMulti?: boolean
} & UseControllerProps<FieldValues>

export default function SelectInput(props: Props) {
  const { label, hint, rules, options, isMulti } = props;
  const { field, fieldState } = useController(props);

  const defaultOption:Option|undefined|Option[] = _.filter(options, (option) => {
    if (Array.isArray(field.value)) {
      return _.includes(field.value, option.value);
    };
    return option.value === field.value;
  })

  return (
    <div className="Input Input--select">
      <label>
        {label}
        {rules?.required &&
          <span>*</span>
        }
      </label>

      <Select
        className='Select'
        classNames={{
          control: () => 'Select-control'
        }}
        isMulti={isMulti}
        value={defaultOption}
        options={options}
        onBlur={field.onBlur}
        onChange={(selected) => {
          if (isMulti) {
            const ids = _.map(selected, (item) => {
              return item?.value;
            })
            field.onChange(ids)
            return;
          }
          field.onChange(selected?.value);
        }}
      />

      {hint &&
        <div className="Input-hint">{hint}</div>
      }

      {fieldState.invalid &&
        <div className="Input-error">{fieldState.error?.message}</div>
      }
    </div>
  );
}