import { Oval } from "react-loader-spinner";
import React from "react";

export default function LoadingOval({ visible }: { visible: boolean }) {
  return (
    <div className="OvalContainer">
      <Oval
        visible={visible}
        height="120"
        width="120"
        color="#007BFF"
        secondaryColor="#007BFF"
      />
    </div>
  );
}
