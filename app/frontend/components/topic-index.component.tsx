// NPM
import _ from "lodash";
import React from "react";
import { useQuery } from "@tanstack/react-query";

// Types
import Topic from "../types/topic.type";

// Services
import TopicService from "../services/topic.service";

// Components
import TopicPreview from "./topic-preview.component";
import Spinner from "./spinner.component";
import WikiBubbleChart from "./wiki-bubble-chart.component";

// Mock Data
import wikiRows from "../mock/wikiRows.json";

function TopicIndex() {
  const { status, data } = useQuery({
    queryKey: ["topics"],
    queryFn: TopicService.getAllTopics,
  });

  const filteredTopics = _.filter(data, (topic): Boolean => {
    return !!(topic.name && topic.slug && topic.start_date);
  }) as Array<Topic>;

  return (
    <section className="Section u-lg-pr05">
      <div className="Container Container--padded">
        {/* Temporary Wiki Bubble Chart for styling */}
        <div style={{ marginBottom: "2rem" }}>
          <h2>Wiki Articles Bubble Chart (Temporary for Styling)</h2>
          <WikiBubbleChart data={wikiRows} actions={true} />
        </div>

        <div className="TopicIndex">
          {status === "pending" && <Spinner />}
          {filteredTopics.map((topic) => (
            <TopicPreview key={topic.id} topic={topic} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TopicIndex;
