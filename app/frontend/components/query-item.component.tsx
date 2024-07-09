import React from "react";
import { BiSolidTrashAlt } from "react-icons/bi";
import AutocompleteInput from "./autocomplete-input.component";

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
    <div className="Box QueryItem u-mt1">
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
      <AutocompleteInput
        qValue={qValue}
        property={property}
        onValueChange={(value) => handleTextFieldChange(index, value)}
      />

      {properties.length > 1 && (
        <div
          className="RemoveIcon"
          onClick={() => handleRemoveQueryItem(index)}
        >
          <BiSolidTrashAlt size={28} />
        </div>
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
