import { Oval } from "react-loader-spinner";
import React from "react";

export default function LoadingOval({
  visible,
  height,
  width,
}: {
  visible: boolean;
  height: string;
  width: string;
}) {
  return (
    <div className="OvalContainer">
      <Oval
        visible={visible}
        height={height}
        width={width}
        color="#007BFF"
        secondaryColor="#007BFF"
      />
    </div>
  );
}
