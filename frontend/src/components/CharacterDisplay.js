import React, { useState, useEffect } from 'react';
import './CharacterDisplay.css';
import { io } from 'socket.io-client';

const socket = io();

const CharacterDisplay = () => {
    const [state, setState] = useState('idle'); // idle, generating, video

    useEffect(() => {
        socket.on('ai-response', () => setState('generating'));
        socket.on('audio-ready', () => setState('generating'));
        socket.on('video-ready', () => setState('video'));

        return () => {
            socket.off('ai-response');
            socket.off('audio-ready');
            socket.off('video-ready');
        };
    }, []);

    return (
        <div className="character-display">
            {state === 'idle' && (
                <img
                    src="/static/character-idle.png"
                    alt="Idle Character"
                    className="character-image"
                />
            )}
            {state === 'generating' && (
                <div className="character-overlay">Generating...</div>
            )}
            {state === 'video' && (
                <video
                    src="/static/generated-video.mp4"
                    autoPlay
                    loop
                    className="character-video"
                />
            )}
        </div>
    );
};

export default CharacterDisplay;