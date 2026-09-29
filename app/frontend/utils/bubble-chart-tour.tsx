import React from "react";
import type { Props, Step } from "react-joyride";

export const TOUR_STEPS: Step[] = [
  {
    target: ".WikiBubbleChart",
    placement: "center",
    title: "Welcome to Wikipedia Panorama",
    content: "A visual way to explore Wikipedia articles",
    locale: { skip: "No, thanks" },
  },
  {
    target: ".WikiBubbleChart",
    placement: "center",
    content:
      "Wikipedia Panorama allows you to have a general overview of articles on a specific topic.",
  },
  {
    target: ".WikiBubbleChart .Container",
    placement: "top",
    content:
      "Each bubble represents an article on the topic. The bubble size changes depending on different article metrics. Click any bubble to open that article's details.",
  },
  {
    target: '.WikiBubbleChart [data-tour="legend"]',
    placement: "bottom",
    content: (
      <img
        className="TourLegendImage"
        src="/images/legend.png"
        alt="Chart legend"
      />
    ),
  },
  {
    target:
      '.WikiBubbleChart .TabPanel:not([hidden]) [data-tour="vertical-axis"]',
    placement: "bottom",
    content: "You can rearrange the data along the vertical axis.",
  },
  {
    target:
      '.WikiBubbleChart .TabPanel:not([hidden]) [data-tour="horizontal-axis"]',
    placement: "bottom",
    content: "And you can rearrange the data along the horizontal axis.",
  },
  {
    id: "sidebar",
    target: ".WikiBubbleChart .FilteredArticlesSidebar",
    placement: "left",
    content:
      "The sidebar lists the filtered articles. It allows you to trim outliers, inspect details, or remove articles from the chart.",
  },
  {
    target: '.WikiBubbleChart [data-tour="languages-tab"]',
    placement: "bottom",
    content:
      "The languages tab compares articles across their different linguistic versions.",
  },
  {
    target: '.WikiBubbleChart [data-tour="time-travel-tab"]',
    placement: "bottom",
    content:
      "And the Time travel tab compares the same articles at two points in time. Pick two years to see a chart for each one, side by side.",
  },
  {
    target: ".WikiBubbleChart",
    placement: "center",
    content:
      "Explore the articles, see how Wikipedia changes over time, and contribute to sharing your knowledge!",
    locale: { last: "Finish tour" },
  },
];

export const SIDEBAR_STEP_INDEX = TOUR_STEPS.findIndex(
  (step) => step.id === "sidebar",
);

export const JOYRIDE_OPTIONS: Props["options"] = {
  primaryColor: "#1976d2",
  textColor: "#424242",
  backgroundColor: "#ffffff",
  arrowColor: "#ffffff",
  overlayColor: "#00000080",
  zIndex: 10000,
  width: 360,
  showProgress: true,
  skipBeacon: true,
  overlayClickAction: false,
  buttons: ["back", "skip", "primary"],
};

export const JOYRIDE_STYLES: Props["styles"] = {
  tooltip: {
    borderRadius: 6,
    padding: 16,
    boxShadow: "none",
    border: "1px solid #e0e0e0",
  },
  floater: { filter: "none" },
};
