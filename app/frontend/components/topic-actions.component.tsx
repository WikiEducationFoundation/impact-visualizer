// NPM
import _ from "lodash";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import cn from "classnames";

// Types

// Components
import TopicAction from "./topic-action.component";

// Utils

function renderActions({ topic, setCanEditTopic }) {
  const output: React.JSX.Element[] = [];
  const actions: String[] = [];

  // Topic Builder imports own the article (and eventually the user)
  // list; the CSV upload UI doesn't apply. Until TB starts emitting
  // users, a TB topic just runs with 0 users — the backend allows it.
  const isTbTopic = !!topic.tb_handle;

  const isSettled = (status: string) =>
    !status || status === "idle" || status === "complete";

  // Backend (TopicService#incremental_topic_build) only requires articles,
  // not users. CSV-driven topics historically gated on user_count > 0 too;
  // keep that for non-TB topics so the prior UX is preserved. TB topics
  // also skip the users_import_status check — they never run a user
  // import, so a stale users_import_job_id from a different code path
  // shouldn't keep blocking timepoint generation.
  if (
    topic.articles_count > 0 &&
    isSettled(topic.articles_import_status) &&
    (isTbTopic
      ? true
      : topic.user_count > 0 && isSettled(topic.users_import_status))
  ) {
    actions.push("incremental_topic_build");
  }

  if (!isTbTopic) actions.push("users");
  actions.push("articles");
  actions.push("article_analytics");

  actions.forEach((action) => {
    output.push(
      <TopicAction
        setCanEditTopic={setCanEditTopic}
        topic={topic}
        key={action as React.Key}
        actionKey={action}
      />
    );
  });

  return output;
}

function TopicActions({ topic }) {
  const [canEditTopic, setCanEditTopic] = useState<boolean>(true);

  return (
    <div className="TopicActions">
      <h4>Management Actions</h4>

      <div className="TopicActions-actions">
        {renderActions({ topic, setCanEditTopic })}
      </div>

      <div className="TopicActions-finePrint">
        Actions execute the background, you <strong>may</strong> navigate away
        from the page after initiating.
      </div>

      <Link
        to={`/my-topics/edit/${topic.id}`}
        className={cn({
          Button: true,
          "Button--disabled": !canEditTopic,
        })}
      >
        Edit Topic
      </Link>
    </div>
  );
}

export default TopicActions;
