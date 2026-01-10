import _ from "lodash";
import React from "react";
import { Link } from "react-router-dom";

function UserStatus() {
  const csrfToken = _.get(
    document.querySelector("meta[name=csrf-token]"),
    "content"
  );
  const { signedIn, username, isAdmin } = window.app;

  return (
    <div className="Header-userStatus">
      {!signedIn && (
        <form method="post" action="/topic_editors/auth/mediawiki">
          <input name="authenticity_token" value={csrfToken} type="hidden" />
          <button className="Button">Log in with Wikimedia</button>
        </form>
      )}

      {signedIn && (
        <div className="Header-userInfo">
          <Link className="Button u-mr1" to="/my-topics">
            {isAdmin ? "Manage All Topics" : "Manage Your Topics"}
          </Link>
          <span className="u-mr1">
            Signed in as <strong>{username}</strong>
            {isAdmin && <span className="Header-adminLabel"> (admin)</span>}
          </span>
          <a href="/logout">Log out</a>
        </div>
      )}
    </div>
  );
}

export default UserStatus;
