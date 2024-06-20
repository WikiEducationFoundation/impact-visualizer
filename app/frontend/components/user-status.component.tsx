import _ from "lodash";
import React from "react";

function UserStatus() {
  const csrfToken = _.get(document.querySelector('meta[name=csrf-token]'), 'content');
  const { signedIn, username } = window.app;
  
  return (
    <div className="Header-userStatus">
      {!signedIn &&
        <form method="post" action="/topic_editors/auth/mediawiki">
          <input name="authenticity_token" value={csrfToken} type="hidden" />
          <button className="Button">Log in with Wikimedia</button>
        </form>
      }

      {signedIn &&
        <div>
          <span className="u-mr1">
            Signed in as <strong>{username}</strong>
          </span>
          <a href="/logout">Log out</a>
        </div>
      }
    </div>
  );
}

export default UserStatus;
