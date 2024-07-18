import React from "react"
import { UseControllerProps, useController,
         FieldValues } from "react-hook-form";

type Props = {
  label: String,
  hint?: String
} & UseControllerProps<FieldValues>

export default function TextAreaInput(props: Props) {
  const { label, hint, rules } = props;
  const { field, fieldState } = useController(props);

  return (
    <div className="Input Input--textArea">
      <label>
        {label}
        {rules?.required &&
          <span>*</span>
        }
      </label>

      <textarea
        {...field}
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