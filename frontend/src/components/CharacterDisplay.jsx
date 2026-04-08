import React from 'react';
import './CharacterDisplay.css';

const CharacterDisplay = ({ avatarPath, displayName, audioState }) => {
    const idleImage = avatarPath || '/static/character-idle.png';

    const stateClass = audioState === 'playing' ? 'speaking' :
                       audioState === 'loading' ? 'loading-audio' : '';

    return (
        <div className="character-display">
            <div className={`avatar-wrapper ${stateClass}`}>
                {/* Glow rings for speaking state */}
                {audioState === 'playing' && (
                    <>
                        <div className="glow-ring ring-1" />
                        <div className="glow-ring ring-2" />
                        <div className="glow-ring ring-3" />
                    </>
                )}
                {audioState === 'loading' && (
                    <div className="glow-ring ring-loading" />
                )}
                <img
                    src={idleImage}
                    alt={displayName || 'AI Companion'}
                    className="character-image"
                />
            </div>
        </div>
    );
};

export default CharacterDisplay;
