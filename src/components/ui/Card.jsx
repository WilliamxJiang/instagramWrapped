import React from "react";

const Card = ({ children, className }) => {
  return (
    <div className={`p-8 rounded-lg shadow-lg bg-white ${className}`}>
      {children}
    </div>
  );
};

export default Card;
