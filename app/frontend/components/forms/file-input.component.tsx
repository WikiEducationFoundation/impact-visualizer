import _ from 'lodash';
import React from 'react';
import { UseControllerProps, useController, FieldValues } from 'react-hook-form';

type Props = {
  label?: string,
  hint?: string | Function,
  currentFilename?: string,
  currentFilePath?: string
} & UseControllerProps<FieldValues>

export default function FileInput(props: Props) {
  const { label, hint, rules, currentFilename, currentFilePath } = props;
  const { field, fieldState } = useController(props);

  return (
    <div className="Input Input--file">
      {label &&
        <label>
          {label}
          {rules?.required &&
            <span>*</span>
          }
        </label>
      }

      <div
        className="FileInput-fieldWrapper"
      >
        {(currentFilename && currentFilePath) &&
            <div className="FileInput-current">
              <span>Current:</span>
              {' '}
              <a
                href={currentFilePath}
                target="_blank"
              >
                {currentFilename}
              </a>
            </div>
            
        }
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
      </div>

      {hint &&
        <div className="Input-hint">{typeof hint === 'function' ? hint() : hint}</div>
      }

      {fieldState.invalid &&
        <div className="Input-error">{fieldState.error?.message}</div>
      }
    </div>
  );
}