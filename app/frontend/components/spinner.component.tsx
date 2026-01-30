// NPM
import React from "react";
import cn from "classnames";

function Spinner({
  size = "large",
  color = "blue",
}: {
  size?: "large" | "small";
  color?: "blue" | "red" | "white";
}) {
  return (
    <div
      className={cn({
        Spinner: true,
        [`Spinner--${size}`]: true,
        [`Spinner--${color}`]: color,
      })}
    />
  );
}

export default Spinner;
