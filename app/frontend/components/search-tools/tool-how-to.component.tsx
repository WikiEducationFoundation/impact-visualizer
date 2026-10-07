import React from "react";

interface ToolHowToExample {
  inputs: { label: string; value: string }[];
  result: string;
}

interface ToolHowToProps {
  steps: React.ReactNode[];
  example?: ToolHowToExample;
}

export default function ToolHowTo({ steps, example }: ToolHowToProps) {
  return (
    <details className="ToolHowTo" open>
      <summary>How to use</summary>
      <ol>
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
      {example && (
        <div className="ToolHowTo-example">
          <strong>Example</strong>
          <ul className="ToolHowTo-exampleInputs">
            {example.inputs.map((input, index) => (
              <li key={index}>
                {input.label}: <code>{input.value}</code>
              </li>
            ))}
          </ul>
          <span className="ToolHowTo-exampleResult">
            Returns {example.result}
          </span>
        </div>
      )}
    </details>
  );
}
