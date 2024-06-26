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
  hint?: String
} & UseControllerProps<FieldValues>

export default function SelectInput(props: Props) {
  const { label, hint, rules, options } = props;
  const { field, fieldState } = useController(props);

  const defaultOption:Option|undefined = _.find(options, { value: field.value })

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
        defaultValue={defaultOption}
        options={options}
        onBlur={field.onBlur}
        onChange={(selected) => {
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