import React from 'react'
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { UseControllerProps, useController,
         FieldValues } from 'react-hook-form';

type Props = {
  label: String,
  hint?: String
} & UseControllerProps<FieldValues>

export default function DateInput(props: Props) {
  const { label, hint, rules } = props;
  const { field, fieldState } = useController(props);

  return (
    <div className="Input Input--input">
      <label>
        {label}
        {rules?.required &&
          <span>*</span>
        }
      </label>

      <DatePicker
        selected={field.value}
        onChange={field.onChange}
        onSelect={field.onChange}
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