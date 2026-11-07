import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdFeedback } from "react-icons/md";

const FEEDBACK_URL =
  "https://meta.wikimedia.org/wiki/Talk:Visual_Analytics_for_Sustainability_and_Climate_Change/Tool?action=edit&section=new";

function FeedbackButton() {
  const headerButtonRef = useRef<HTMLAnchorElement>(null);
  const [headerButtonVisible, setHeaderButtonVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setHeaderButtonVisible(entry.isIntersecting)
    );
    observer.observe(headerButtonRef.current!);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a
        ref={headerButtonRef}
        className="Button Button--feedback"
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Give Feedback
        <MdFeedback className="Button-icon" />
      </a>
      {createPortal(
        <a
          className={`FloatingFeedback${headerButtonVisible ? "" : " is-visible"}`}
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Give Feedback"
          aria-hidden={headerButtonVisible}
          tabIndex={headerButtonVisible ? -1 : 0}
        >
          <MdFeedback className="Button-icon" />
          <span className="FloatingFeedback-label">Give Feedback</span>
        </a>,
        document.body
      )}
    </>
  );
}

export default FeedbackButton;
