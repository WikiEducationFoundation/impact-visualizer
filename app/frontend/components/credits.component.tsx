import React from "react";

function Credits() {
  return (
    <div className="Container Container--padded">
      <h1 className="Credits-title">Credits</h1>
      <p className="Credits-intro">
        Visualizing Impact is the work of many people. Thank you to everyone who
        has contributed to building, designing, and improving the tool.
      </p>

      <dl className="Credits-list">
        <dt className="Credits-role">Design &amp; Development</dt>
        <dd className="Credits-names">
          Sage Ross
          <br />
          Ahmed Amine Hassou
          <br />
          Matt Fordham
        </dd>

        <dt className="Credits-role">Design</dt>
        <dd className="Credits-names">Giovanni Profeta</dd>

        <dt className="Credits-role">Feedback, iteration and testing</dt>
        <dd className="Credits-names">
          The{" "}
          <a
            href="https://meta.wikimedia.org/wiki/Visual_Analytics_for_Sustainability_and_Climate_Change/Credits"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visual Analytics for Sustainability and Climate Change
          </a>{" "}
          team
        </dd>
      </dl>
    </div>
  );
}

export default Credits;
