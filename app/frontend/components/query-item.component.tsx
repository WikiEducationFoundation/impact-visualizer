import React from "react";

export default function QueryItem({
  handleChange,
  handleTextFieldChange,
  property,
  qValue,
  properties,
  handleRemoveQueryItem,
  index,
}: QueryItemProps) {
  return (
    <div className="query-item">
      <select
        onChange={(e) => handleChange(index, e.target.value)}
        value={property}
        required
      >
        <option value="">--Please choose a property--</option>
        <option value="gender">Gender</option>
        <option value="ethnicity">Ethnicity</option>
        <option value="occupation">Occupation</option>
      </select>
      <input
        type="text"
        value={qValue}
        onChange={(e) => handleTextFieldChange(index, e.target.value)}
        placeholder="Enter a Value"
        required
      />
      {properties.length > 1 && (
        <button type="button" onClick={() => handleRemoveQueryItem(index)}>
          Remove
        </button>
      )}
    </div>
  );
}

type QueryItemProps = {
  handleChange: (index: number, value: string) => void;
  handleTextFieldChange: (index: number, value: string) => void;
  property: string;
  qValue: string;
  properties: QueryProperty[];
  handleRemoveQueryItem: (index: number) => void;
  index: number;
};

type QueryProperty = {
  property: string;
  qValue: string;
};
