import React, { useState } from 'react';
import './InputBar.css';

const InputBar = ({ onSend }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const handleSend = () => {
        if (input.trim()) {
            onSend(input);
            setInput('');
            setIsTyping(false);
        }
    };

    return (
        <div className="input-bar">
            <input
                type="text"
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    setIsTyping(true);
                }}
                placeholder="Say something..."
                className="input-field"
            />
            <button onClick={handleSend} className="send-button" disabled={!input.trim()}>
                {isTyping ? 'Typing...' : 'Send'}
            </button>
            <div className="status">
                {isTyping && <span>Typing...</span>}
            </div>
        </div>
    );
};

export default InputBar;