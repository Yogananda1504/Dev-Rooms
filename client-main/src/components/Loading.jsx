import React from 'react';
import './Loading.css';

const Loading = () => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="emoji-spinner">😊</div>
        <p className="loading-text">Loading user moods...</p>
      </div>
    </div>
  );
};

export default Loading;