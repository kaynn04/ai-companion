import React from 'react';
import './UI.css';

const UI = ({ displayName }) => {
    return (
        <div className="ui-header">
            <div className="influencer-badge">
                <span className="influencer-name">{displayName || 'AI Companion'}</span>
                <span className="ai-badge">AI</span>
            </div>
        </div>
    );
};

export default UI;
