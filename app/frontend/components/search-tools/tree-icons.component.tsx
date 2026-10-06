import React from "react";
import { FC } from "react";
import { FaCheckSquare, FaMinusSquare, FaSquare } from "react-icons/fa";
import { IoMdArrowDropright } from "react-icons/io";

export const ArrowIcon: FC<ArrowIconProps> = ({ isOpen, className = "" }) => {
  const classes = `arrow ${
    isOpen ? "arrow--open" : "arrow--closed"
  } ${className}`;
  return <IoMdArrowDropright className={classes} />;
};

export const CheckBoxIcon: FC<CheckBoxIconProps> = ({ variant, onClick }) => {
  switch (variant) {
    case "disabled":
      return (
        <FaSquare
          onClick={onClick}
          className="checkbox-icon"
          style={{ opacity: 0.5 }}
        />
      );
    case "all":
      return <FaCheckSquare onClick={onClick} className="checkbox-icon" />;
    case "none":
      return <FaSquare onClick={onClick} className="checkbox-icon" />;
    case "some":
      return <FaMinusSquare onClick={onClick} className="checkbox-icon" />;
    default:
      return null;
  }
};

type CheckBoxIconProps = {
  variant: "all" | "none" | "some" | "disabled";
  onClick: (event: React.MouseEvent<SVGElement, MouseEvent>) => void;
};

type ArrowIconProps = {
  isOpen: boolean;
  className?: string;
};
