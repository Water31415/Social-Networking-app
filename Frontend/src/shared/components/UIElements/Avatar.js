import React from 'react';
import './Avatar.css';

const Avatar = props => {
  return (
    <div className={`avatar ${props.className || ''}`} style={props.style}>
      <img
        className="avatar-style"
        src={props.image}
        alt={props.alt}
      />
    </div>
  );
};

export default Avatar;