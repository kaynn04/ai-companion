import React from 'react';
import './PlatformSelector.css';

const platforms = [
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'twitter', label: 'X', icon: '𝕏' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' }
];

const PlatformSelector = ({ detected = [] }) => {
  // Support both single string and array
  const detectedList = Array.isArray(detected) ? detected : [detected].filter(Boolean);

  return (
    <div className="platform-selector">
      {platforms.map((p) => (
        <div
          key={p.id}
          className={`platform-icon ${detectedList.includes(p.id) ? 'active' : ''}`}
          title={p.label}
        >
          <span className="platform-emoji">{p.icon}</span>
          <span className="platform-label">{p.label}</span>
        </div>
      ))}
    </div>
  );
};

export default PlatformSelector;
