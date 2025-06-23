// NPM
import _ from "lodash";
import React from "react";
import moment from "moment";
import pluralize from "pluralize";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";

// Components
import Spinner from "./spinner.component";
import StatBlock from "./stat-block.component";
import QualityStatBlock from "./quality-stat-block.component";
import StatDetail from "./stat-detail.component";
import TopicActions from "./topic-actions.component";

// Misc
import TopicService from "../services/topic.service";
import TopicUtils from "../utils/topic-utils";
import ChartUtils from "../utils/chart-utils";
import WikiBubbleChart from "./wiki-bubble-chart.component";

function renderLoading() {
  return (
    <section className="Section">
      <div className="Container Container--padded">
        <Spinner />
      </div>
    </section>
  );
}

function renderIntro({ topic, editorLabel }) {
  return (
    <div className="TopicDetailIntro u-mb2">
      <div className="u-limitWidth50">
        <h1 className="u-mt1 u-h1">{topic.name}</h1>

        <h3 className="u-mb05">
          Focus Period: {moment(topic.start_date).format("MMMM YYYY")} –{" "}
          {topic.end_date
            ? moment(topic.end_date).format("MMMM YYYY")
            : moment().format("MMMM YYYY")}
        </h3>

        <h4 className="u-mb05">
          {topic.user_count} {editorLabel}
        </h4>

        <h4 className="u-mb1">
          Project: {_.get(topic, "wiki.language")}.
          {_.get(topic, "wiki.project")}
        </h4>

        {topic.description && <p>{topic.description}</p>}
      </div>

      {topic.owned && <TopicActions topic={topic} />}
    </div>
  );
}

function renderStatBlocks({
  activeStat,
  handleStatSelect,
  topic,
  editorLabel,
}) {
  return (
    <div className="StatBlocks u-mb2">
      <StatBlock
        active={activeStat === "articles"}
        onSelect={() => handleStatSelect("articles")}
        stats={[
          {
            label: "Total Articles",
            value: topic.articles_count,
            primary: true,
          },
          {
            label: `${pluralize(
              "Article",
              topic.articles_count_delta
            )} Created`,
            value: topic.articles_count_delta,
          },
          {
            label: `Articles Created by ${editorLabel}`,
            value: TopicUtils.formatAttributedArticles(topic),
          },
          {
            label: "Missing Articles",
            value: topic.missing_articles_count,
          },
        ]}
      />

      <StatBlock
        active={activeStat === "revisions"}
        onSelect={() => handleStatSelect("revisions")}
        stats={[
          {
            label: "Total Revisions",
            value: topic.revisions_count,
            primary: true,
          },
          {
            label: `${pluralize(
              "Revision",
              topic.revisions_count_delta
            )} Created`,
            value: topic.revisions_count_delta,
          },
          {
            label: `Revisions Created by ${editorLabel}`,
            value: TopicUtils.formatAttributedRevisions(topic),
          },
        ]}
      />

      <StatBlock
        active={activeStat === "tokens"}
        onSelect={() => handleStatSelect("tokens")}
        stats={[
          {
            label: `Total ${TopicUtils.pluralizeTokenOrWord(topic)}`,
            value: TopicUtils.tokenOrWordCount(topic, topic.token_count),
            primary: true,
          },
          {
            label: `${TopicUtils.pluralizeTokenOrWord(topic)} Created`,
            value: TopicUtils.tokenOrWordCount(topic, topic.token_count_delta),
          },
          {
            label: `${TopicUtils.pluralizeTokenOrWord(
              topic
            )} Created by ${editorLabel}`,
            value: TopicUtils.formatAttributedTokensOrWords(topic),
          },
        ]}
      />
      <StatBlock
        active={activeStat === "bubble"}
        onSelect={() => handleStatSelect("bubble")}
        stats={[
          {
            label: "Articles in Chart",
            value: topic.articles_count,
            primary: true,
          },
          {
            label: "Missing Articles",
            value: topic.missing_articles_count,
          },
        ]}
      />

      {!_.isEmpty(topic.wp10_prediction_categories) && (
        <QualityStatBlock
          active={activeStat === "wp10"}
          onSelect={() => handleStatSelect("wp10")}
          stats={topic.wp10_prediction_categories}
          topic={topic}
        />
      )}
    </div>
  );
}

function TopicDetail() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const location = useLocation();

  const { status, data: topic } = useQuery({
    queryKey: ["topic", id],
    queryFn: ({ queryKey }) => TopicService.getTopic(queryKey[1]),
    refetchInterval: (query) => {
      const owned = _.get(query, "state.data.owned", false);
      return owned ? 5000 : false;
    },
  });

  const { data: topicTimepoints } = useQuery({
    queryKey: ["topicTimepoints", id],
    queryFn: ({ queryKey }) => TopicService.getTopicTimepoints(queryKey[1]),
  });

  const { data: articleAnalytics } = useQuery({
    queryKey: ["articleAnalytics", id],
    queryFn: ({ queryKey }) => TopicService.getArticleAnalytics(queryKey[1]),
  });

  console.log(articleAnalytics);

  if (status === "pending" || !topic) {
    return renderLoading();
  }

  const activeStat = _.replace(location.hash, "#", "") || "articles";
  const editorLabel = _.upperFirst(
    pluralize(topic.editor_label, topic.user_count)
  );

  function handleStatSelect(key: string) {
    navigate(`#${key}`, { preventScrollReset: true });
  }
  const hasTimepointStats = topic.has_stats && topicTimepoints;
  const hasArticleAnalytics = topic.has_analytics;
  return (
    <section className="Section">
      <div className="Container Container--padded">
        <div className="TopicDetail">
          <div className="TopicDetail-header">
            {!topic.owned && <Link to="/">← Back to all Topics</Link>}

            {topic.owned && <Link to="/my-topics">← Back to My Topics</Link>}
          </div>

          {renderIntro({ topic, editorLabel })}

          {hasTimepointStats && (
            <>
              {renderStatBlocks({
                topic,
                handleStatSelect,
                editorLabel,
                activeStat,
              })}
              {activeStat === "bubble" && (
                <div className="u-mt2">
                  <WikiBubbleChart data={articleAnalytics} actions />
                </div>
              )}
              {activeStat !== "bubble" && (
                <>
                  <StatDetail
                    stat={activeStat}
                    topic={topic}
                    topicTimepoints={topicTimepoints}
                    fields={ChartUtils.fieldsForStat(activeStat)}
                    type="delta"
                  />
                  <br />
                  {activeStat !== "wp10" && (
                    <StatDetail
                      stat={activeStat}
                      topic={topic}
                      topicTimepoints={topicTimepoints}
                      fields={ChartUtils.fieldsForStat(activeStat)}
                      type="cumulative"
                    />
                  )}
                </>
              )}
            </>
          )}

          {!hasTimepointStats && hasArticleAnalytics && (
            <div className="u-mt2">
              <h3>Article Analytics</h3>
              <WikiBubbleChart data={articleAnalytics} actions />
            </div>
          )}

          {!hasTimepointStats && !hasArticleAnalytics && (
            <div className="TopicDetail-noStats">
              This Topic has not yet been analyzed
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default TopicDetail;
