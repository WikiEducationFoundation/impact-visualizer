import React, { useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";

const userSetOptions = [
  { value: "", label: "-- Choose an option --" },
  { value: "wiki-student-program", label: "Wikipedia Student Program" },
  { value: "scholars-scientists", label: "Scholars & Scientists" },
];

export default function UserSetTool() {
  const [selectedUserSet, setSelectedUserSet] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    setIsLoading(true);
    event.preventDefault();

    if (!selectedUserSet) {
      toast("Please select a user set");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="Container Container--padded">
      <h1>Impact Search</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Select user set:
          <Select
            options={userSetOptions}
            value={userSetOptions.find(
              (option) => option.value === selectedUserSet
            )}
            onChange={(selectedOption) =>
              setSelectedUserSet((selectedOption as any).value)
            }
          />
        </label>
      </form>
    </div>
  );
}
