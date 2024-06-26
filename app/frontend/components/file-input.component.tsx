import _ from 'lodash';
import React from 'react';
import { UseControllerProps, useController, FieldValues } from 'react-hook-form';

type Props = {
  label: String,
  hint?: String
} & UseControllerProps<FieldValues>

export default function Input(props: Props) {
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

      <input
        type='file'
        onChange={(e) => {
          const file = _.get(e, 'target.files[0]');
          field.onChange(file);
        }}
        onBlur={field.onBlur}
      />

      <input
        type="hidden"
        ref={field.ref}
        name={field.name}
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