import React, { useState, useRef, useEffect } from 'react';
import './InputBar.css';

const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

const MicIcon = ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#ef4444' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="1" width="6" height="11" rx="3" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const InputBar = ({ onSend, isListening, onListeningChange }) => {
    const [input, setInput] = useState('');
    const [disabled, setDisabled] = useState(false);
    const recognitionRef = useRef(null);
    const hasSpeech = !!SpeechRecognition;

    useEffect(() => {
        if (!hasSpeech) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                setInput('');
                onSend(final.trim());
                onListeningChange(false);
            } else {
                setInput(interim);
            }
        };

        recognition.onerror = (event) => {
            console.error('[Speech] Error:', event.error);
            onListeningChange(false);
        };

        recognition.onend = () => {
            onListeningChange(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
        };
    }, [hasSpeech]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            onListeningChange(false);
        } else {
            setInput('');
            recognitionRef.current.start();
            onListeningChange(true);
        }
    };

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="input-bar">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening...' : 'Say something...'}
                className={`input-field ${isListening ? 'listening' : ''}`}
                disabled={disabled}
            />
            {hasSpeech && (
                <button
                    onClick={toggleListening}
                    className={`mic-button ${isListening ? 'mic-active' : ''}`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                    <MicIcon active={isListening} />
                </button>
            )}
            <button
                onClick={handleSend}
                className="send-button"
                disabled={!input.trim() || disabled}
            >
                Send
            </button>
        </div>
    );
};

export default InputBar;
