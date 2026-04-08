import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Onboarding from './pages/Onboarding';
import UI from './components/UI';
import Disclosure from './components/Disclosure';
import CharacterDisplay from './components/CharacterDisplay';
import InputBar from './components/InputBar';
import { io } from 'socket.io-client';

const socket = io({
    reconnection: true,
    reconnectionAttempts: 5
});

socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
});
socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
});

const App = () => {
    const [sessionId, setSessionId] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [audioState, setAudioState] = useState('idle'); // idle, loading, playing
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/#\/chat\/(.+)/);
        if (match) {
            const id = match[1];
            setSessionId(id);
            loadSession(id);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSession = async (id) => {
        try {
            const res = await fetch(`/api/session/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSessionData(data);
            }
        } catch (err) {
            console.error('Failed to load session:', err);
        }
    };

    const handleOnboardingComplete = (id) => {
        setSessionId(id);
        window.location.hash = `#/chat/${id}`;
        loadSession(id);
    };

    // Play TTS audio for AI response
    const playTTS = async (text) => {
        setAudioState('loading');
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, sessionId })
            });

            if (!res.ok) {
                console.warn('[TTS] Unavailable:', res.status);
                setAudioState('idle');
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            // Stop any currently playing audio
            if (audioRef.current) {
                audioRef.current.pause();
                URL.revokeObjectURL(audioRef.current.src);
            }

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onplay = () => setAudioState('playing');
            audio.onended = () => {
                setAudioState('idle');
                URL.revokeObjectURL(url);
            };
            audio.onerror = () => {
                setAudioState('idle');
                URL.revokeObjectURL(url);
            };

            await audio.play();
        } catch (err) {
            console.error('[TTS] Error:', err);
            setAudioState('idle');
        }
    };

    useEffect(() => {
        socket.on('ai-response', (data) => {
            setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
            // Auto-play voice response
            playTTS(data.text);
        });

        return () => {
            socket.off('ai-response');
        };
    }, [sessionId]);

    const handleSend = (message) => {
        setMessages(prev => [...prev, { role: 'user', text: message }]);
        socket.emit('message', { text: message, sessionId });
    };

    if (!sessionId) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    // Determine voice indicator text
    const voiceIndicator = isListening ? '🎤 Listening...' :
                           audioState === 'playing' ? '🔊 Speaking...' :
                           audioState === 'loading' ? '⏳ Generating voice...' : null;

    return (
        <div className="app-container">
            <UI displayName={sessionData?.displayName} />
            <CharacterDisplay
                avatarPath={sessionData?.avatarPath}
                displayName={sessionData?.displayName}
                audioState={audioState}
            />
            {voiceIndicator && (
                <div className="voice-indicator">{voiceIndicator}</div>
            )}
            <div className="messages-area">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <div className="message-bubble">{msg.text}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <Disclosure displayName={sessionData?.displayName} />
            <InputBar
                onSend={handleSend}
                isListening={isListening}
                onListeningChange={setIsListening}
            />
        </div>
    );
};

export default App;
