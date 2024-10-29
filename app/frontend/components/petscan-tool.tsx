import React, { useState } from "react";

export default function PetScanTool() {
  const [petscanID, setPetscanID] = useState<string>("");
  const [queryResult, setQueryResult] = useState(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!petscanID) {
      alert("Please enter a PetScan ID.");
      return;
    }

    try {
      const response = await fetch(
        `https://petscan.wmflabs.org/?psid=${petscanID}&format=json&origin=*`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setQueryResult(data);
    } catch (error) {
      console.error("Fetch error:", error);
      alert("There was an issue fetching the data.");
    }
  };

  return (
    <div className="Container Container--padded">
      <h1>Impact Search</h1>

      <form onSubmit={handleSubmit}>
        <h3>Enter PetScan ID</h3>
        <input
          className="PetscanInput"
          type="text"
          value={petscanID}
          onChange={(event) => setPetscanID(event.target.value)}
          placeholder="PetScan ID"
          required
        />

        <div>
          <button type="submit" className="Button u-mt2">
            Run Query
          </button>
        </div>
      </form>

      {queryResult && (
        <div className="QueryResult">
          <h3>Query Result</h3>
          <pre>{JSON.stringify(queryResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
