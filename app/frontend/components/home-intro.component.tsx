import _ from "lodash";
import React from "react";

function HomeIntro() {
  const csrfToken = _.get(
    document.querySelector("meta[name=csrf-token]"),
    "content",
  );
  const { signedIn } = window.app;

  return (
    <div className="HomeIntro">
      <div className="HomeIntro-lead">
        <h1 className="HomeIntro-title">
          See the impact of editing on Wikipedia
        </h1>
        <p className="HomeIntro-blurb">
          Visualizing Impact tracks a set of Wikipedia articles over a defined
          period and measures data such as article size, page views, quality
          assessment, number of editors, incoming links, images, etc. Each topic
          page presents that data as an interactive chart, so individual
          articles and overall trends can be explored together.
        </p>
      </div>

      <div className="HomeIntro-howTo">
        <h2 className="HomeIntro-howToTitle">Create a set of articles</h2>
        <ol className="HomeIntro-steps">
          <li className="HomeIntro-step">
            <span className="HomeIntro-stepNum">1</span>
            <span className="HomeIntro-stepText">
              Log in with a Wikimedia account.
            </span>
          </li>
          <li className="HomeIntro-step">
            <span className="HomeIntro-stepNum">2</span>
            <span className="HomeIntro-stepText">
              Prepare a CSV list of articles, and optionally a CSV list of
              users. Generate one with the <strong>Tools</strong> menu from a
              Wikidata query, a Wikipedia category, an Education Dashboard
              course, PetScan, or PagePile, or supply a CSV produced by any
              other means.
            </span>
          </li>
          <li className="HomeIntro-step">
            <span className="HomeIntro-stepNum">3</span>
            <span className="HomeIntro-stepText">
              Create a topic and upload that CSV. The topic page reads the
              exported format directly and charts the articles. Saved topics
              appear under <strong>Manage Your Topics</strong>.
            </span>
          </li>
        </ol>

        {!signedIn && (
          <div className="HomeIntro-cta">
            <form method="post" action="/topic_editors/auth/mediawiki">
              <input
                name="authenticity_token"
                value={csrfToken}
                type="hidden"
              />
              <button className="Button" type="submit">
                Log in with Wikimedia
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeIntro;
