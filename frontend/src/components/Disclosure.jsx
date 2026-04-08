import React from 'react';
import './Disclosure.css';

const Disclosure = ({ displayName }) => {
    return (
        <div className="disclosure">
            Powered by AI — responses are generated, not from {displayName || 'this person'} directly
        </div>
    );
};

export default Disclosure;
