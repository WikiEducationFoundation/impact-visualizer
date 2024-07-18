import React, { HTMLInputTypeAttribute } from "react"
import { UseControllerProps, useController,
         FieldValues } from "react-hook-form";

type Props = {
  label: String,
  hint?: String,
  type?: HTMLInputTypeAttribute,
  min?: number
} & UseControllerProps<FieldValues>

export default function GenericInput(props: Props) {
  const { label, hint, type, rules, min } = props;
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
        {...field}
        type={type}
        min={min}
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