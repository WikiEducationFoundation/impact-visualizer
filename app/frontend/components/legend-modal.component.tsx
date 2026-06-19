import React from "react";
import { MdLegendToggle } from "react-icons/md";
import { IoClose } from "react-icons/io5";

interface LegendModalProps {
  onClose: () => void;
}

const LegendModal: React.FC<LegendModalProps> = ({ onClose }) => {
  return (
    <div
      className="LegendModal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="Panel">
        <div className="Header">
          <div className="TitleGroup">
            <MdLegendToggle size={20} className="HeaderIcon" />
            <h3 className="Title">Legend</h3>
          </div>
          <button
            type="button"
            className="Close"
            onClick={onClose}
            aria-label="Close legend"
          >
            <IoClose size={24} />
          </button>
        </div>
        <div className="Body">
          <img className="LegendImage" src="/images/legend.png" alt="Chart legend" />
        </div>
      </div>
    </div>
  );
};

export default LegendModal;
