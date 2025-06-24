// NPM
import _ from "lodash";
import React from "react";
import cn from "classnames";
import {
  UseMutateFunction,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import pluralize from "pluralize";

// Types
import Topic from "../types/topic.type";

// Misc
import TopicService from "../services/topic.service";

// Components
import FileUploadForm from "./file-upload-form.component";

const actions = {
  articles: {
    label: "Articles",
    buttonLabel: "Import Articles from CSV",
    isReady: (topic: Topic) => {
      return !!topic.articles_csv_filename;
    },
    isBusy: (topic: Topic) => {
      return topic.articles_import_status !== "idle";
    },
    status: (topic: Topic) => {
      return topic.articles_import_status;
    },
    progress: (topic: Topic) => {
      return topic.articles_import_percent_complete;
    },
    renderButtons: (topic: Topic, mutate: UseMutateFunction) => {
      return null;
      const actionLabel = topic.articles_count > 0 ? "Reimport" : "Import";
      return (
        <button className="Button Button--outlined" onClick={() => mutate()}>
          {actionLabel} Articles from CSV
        </button>
      );
    },
    renderNotReady: (topic: Topic, setCanEditTopic: Function) => {
      return (
        <div>
          <div className="u-mb05">
            You must attach a CSV file containing Article data before importing.
          </div>

          <FileUploadForm
            defaultValues={topic}
            label={null}
            name="articles_csv"
            onSubmitHook={() => {
              setCanEditTopic(false);
            }}
            onCompleteHook={() => {
              setCanEditTopic(true);
            }}
            hint={() => {
              return (
                <a href="/csv/topic-articles-example.csv" target="_blank">
                  See example of Articles CSV file
                </a>
              );
            }}
            currentFilename={topic.articles_csv_filename}
            currentFilePath={topic.articles_csv_url}
          />
        </div>
      );
    },
    renderCurrentCount: (topic: Topic) => {
      return (
        <div className="TopicAction-currentCount">
          Topic currently has <strong>{topic.articles_count}</strong>{" "}
          {`${pluralize("Article", topic.articles_count)}`}
        </div>
      );
    },
    mutationFn: TopicService.import_articles,
  },
  users: {
    label: "Users",
    buttonLabel: "Import Users from CSV",
    isReady: (topic: Topic) => {
      return !!topic.users_csv_filename;
    },
    isBusy: (topic: Topic) => {
      return topic.users_import_status !== "idle";
    },
    status: (topic: Topic) => {
      return topic.users_import_status;
    },
    progress: (topic: Topic) => {
      return topic.users_import_percent_complete;
    },
    renderButtons: (topic: Topic, mutate: UseMutateFunction) => {
      return null;

      const actionLabel = topic.user_count > 0 ? "Reimport" : "Import";
      return (
        <button className="Button Button--outlined" onClick={() => mutate()}>
          {actionLabel} Users from CSV
        </button>
      );
    },
    renderNotReady: (topic: Topic, setCanEditTopic: Function) => {
      return (
        <div>
          <div className="u-mb05">
            You must attach a CSV file containing User data before importing.
          </div>

          <FileUploadForm
            defaultValues={topic}
            label={null}
            name="users_csv"
            onSubmitHook={() => {
              setCanEditTopic(false);
            }}
            onCompleteHook={() => {
              setCanEditTopic(true);
            }}
            hint={() => {
              return (
                <a href="/csv/topic-users-example.csv" target="_blank">
                  See example of Users CSV file
                </a>
              );
            }}
            currentFilename={topic.users_csv_filename}
            currentFilePath={topic.users_csv_url}
          />
        </div>
      );
    },
    renderCurrentCount: (topic: Topic) => {
      return (
        <div className="TopicAction-currentCount">
          Topic currently has <strong>{topic.user_count}</strong>{" "}
          {`${pluralize("User", topic.user_count)}`}
        </div>
      );
    },
    mutationFn: TopicService.import_users,
  },
  timepoints: {
    label: "Timepoints",
    buttonLabel: "Generate Timepoints",
    isReady: (topic: Topic) => {
      return topic.user_count > 0 && topic.articles_count > 0;
    },
    isBusy: (topic: Topic) => {
      return topic.timepoint_generate_status !== "idle";
    },
    status: (topic: Topic) => {
      return topic.timepoint_generate_status;
    },
    progress: (topic: Topic) => {
      return topic.timepoint_generate_percent_complete;
    },
    renderButtons: (topic: Topic, mutate: UseMutateFunction) => {
      const actionLabel =
        topic.timepoints_count > 0 ? "Generate new" : "Generate";
      return (
        <>
          <button className="Button Button--outlined" onClick={() => mutate()}>
            {actionLabel} Timepoints
          </button>

          {topic.timepoints_count > 0 && (
            <div className="u-mt05">
              <button
                className="Button Button--outlined"
                onClick={() => mutate({ force_updates: true })}
              >
                Regenerate all Timepoints
              </button>
            </div>
          )}
        </>
      );
    },
    renderNotReady: () => {
      return (
        <span>
          You must import Users and Articles before generating timepoints
        </span>
      );
    },
    renderCurrentCount: (topic: Topic) => {
      return (
        <div className="TopicAction-currentCount">
          Topic currently has <strong>{topic.timepoints_count}</strong>{" "}
          {`${pluralize("Timepoint", topic.timepoints_count)}`}
        </div>
      );
    },
    mutationFn: TopicService.generate_timepoints,
  },
  article_analytics: {
    label: "Article Analytics",
    buttonLabel: "Generate Article Analytics",
    isReady: (topic: Topic) => {
      return topic.user_count > 0 && topic.articles_count > 0;
    },
    isBusy: (topic: Topic) => {
      return topic.generate_article_analytics_status !== "idle";
    },
    status: (topic: Topic) => {
      return topic.generate_article_analytics_status;
    },
    progress: (topic: Topic) => {
      return topic.generate_article_analytics_percent_complete;
    },
    renderButtons: (_topic, mutate) => {
      return (
        <button className="Button Button--outlined" onClick={() => mutate()}>
          Generate Article Analytics
        </button>
      );
    },
    renderNotReady: () => {
      return (
        <span>
          You must import articles before generating article analytics
        </span>
      );
    },
    renderCurrentCount: () => null,
    mutationFn: TopicService.generate_article_analytics,
  },
  incremental_topic_build: {
    label: "Timepoints",
    buttonLabel: "Generate Timepoints",
    isReady: (topic: Topic) => {
      return topic.articles_count > 0;
    },
    isBusy: (topic: Topic) => {
      return topic.incremental_topic_build_status !== "idle";
    },
    status: (topic: Topic) => {
      return topic.incremental_topic_build_status;
    },
    progress: (topic: Topic) => {
      return topic.incremental_topic_build_percent_complete;
    },
    message: (topic: Topic) => {
      return topic.incremental_topic_build_stage_message;
    },
    renderButtons: (topic: Topic, mutate: UseMutateFunction) => {
      const actionLabel =
        topic.timepoints_count > 0 ? "Generate new" : "Generate";
      return (
        <>
          <button className="Button Button--outlined" onClick={() => mutate()}>
            {actionLabel} Timepoints
          </button>

          {topic.timepoints_count > 0 && (
            <div className="u-mt05">
              <button
                className="Button Button--outlined"
                onClick={() => mutate({ force_updates: true })}
              >
                Regenerate all Timepoints
              </button>
            </div>
          )}
        </>
      );
    },
    renderNotReady: () => {
      return (
        <span>
          You must import Users and Articles before generating timepoints
        </span>
      );
    },
    renderCurrentCount: (topic: Topic) => {
      return (
        <div className="TopicAction-currentCount">
          Topic currently has <strong>{topic.timepoints_count}</strong>{" "}
          {`${pluralize("Timepoint", topic.timepoints_count)}`}
        </div>
      );
    },
    mutationFn: TopicService.incremental_topic_build,
  },
};

function TopicAction({ topic, actionKey, setCanEditTopic }) {
  const queryClient = useQueryClient();
  const action = actions[actionKey];

  const mutation = useMutation({
    mutationFn: (params) => action.mutationFn(topic.id, params),
    onSuccess: (data) => {
      queryClient.setQueryData(["topic", topic.id.toString()], data);
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const isReady = action.isReady(topic);
  const isBusy = action.isBusy(topic);
  const status = action.status(topic);
  const progress = action.progress(topic);

  return (
    <div className="TopicAction">
      <h4>{action.label}</h4>

      {isReady && !isBusy && action.renderButtons(topic, mutation.mutate)}

      {isReady && isBusy && (
        <div className="TopicAction-statusAndProgress">
          <span
            className={cn({
              TopicActionStatus: true,
              [`TopicActionStatus--${status}`]: true,
            })}
          >
            {status}
          </span>
          <span className="u-ml05 TopicAction-progress">
            {typeof action.message === "function" && (
              <span className="u-mr05 TopicAction-progress">
                {action.message(topic)}
              </span>
            )}
            {progress}%
          </span>
        </div>
      )}

      {isReady && action.renderCurrentCount(topic)}

      {!isReady && action.renderNotReady(topic, setCanEditTopic)}
    </div>
  );
}

export default TopicAction;
