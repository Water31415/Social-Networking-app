import React from 'react';
import ReactDOM from 'react-dom';

import './Backdrop.css';

const Backdrop = props => {
  return ReactDOM.createPortal(
    <div className={`backdrop ${props.className || ''}`} onClick={props.onClick}></div>,
    document.getElementById('Backdrop-hook')
  );
};

export default Backdrop;
