import React from 'react';
import './UI.css';

const UI = () => {
    return (
        <div className="ui-container">
            <div className="background-layer"></div>
            <div className="character-layer">
                <img
                    src="/static/character.png"
                    alt="Influencer Character"
                    className="character-image"
                />
            </div>
            <div className="input-bar">
                <input
                    type="text"
                    placeholder="Say something..."
                    className="input-field"
                />
                <button className="send-button">Send</button>
            </div>
        </div>
    );
};

export default UI;