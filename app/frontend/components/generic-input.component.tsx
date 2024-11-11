import React, { HTMLInputTypeAttribute } from "react"
import { UseControllerProps, useController,
         FieldValues } from "react-hook-form";

type Props = {
  label: String,
  hint?: String,
  type?: HTMLInputTypeAttribute,
  min?: number,
  max?: number
} & UseControllerProps<FieldValues>

export default function GenericInput(props: Props) {
  const { name, label, hint, type, rules, min, max } = props;
  const { field, fieldState } = useController(props);

  return (
    <div
      className={`Input Input--input Input--${type}`}
    >
      <label
        htmlFor={name}
      >
        {label}
        {rules?.required &&
          <span>*</span>
        }
      </label>

      <input
        {...field}
        id={name}
        type={type}
        min={min}
        max={max}
        checked={type === 'checkbox' && field.value}
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