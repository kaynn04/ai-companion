import React, { useEffect } from 'react';
import './App.css';
import UI from './components/UI';
import Disclosure from './components/Disclosure';
import CharacterDisplay from './components/CharacterDisplay';
import InputBar from './components/InputBar';
import { io } from 'socket.io-client';

const socket = io();

const App = () => {
    useEffect(() => {
        socket.on('ai-response', (data) => {
            console.log('AI Response:', data);
        });

        socket.on('audio-ready', (data) => {
            console.log('Audio Ready:', data.audioPath);
        });

        socket.on('video-ready', (data) => {
            console.log('Video Ready:', data.videoPath);
        });

        return () => {
            socket.off('ai-response');
            socket.off('audio-ready');
            socket.off('video-ready');
        };
    }, []);

    const handleSend = (message) => {
        console.log('Message sent:', message);
        socket.emit('message', { text: message });
    };

    return (
        <div className="app-container">
            <UI />
            <CharacterDisplay />
            <InputBar onSend={handleSend} />
            <Disclosure />
        </div>
    );
};

export default App;