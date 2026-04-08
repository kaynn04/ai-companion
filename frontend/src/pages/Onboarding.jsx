import React, { useState } from 'react';
import './Onboarding.css';
import PlatformSelector from '../components/PlatformSelector';

const PLATFORM_REGEX = {
  facebook: /facebook\.com/i,
  instagram: /instagram\.com/i,
  twitter: /(x\.com|twitter\.com)/i,
  tiktok: /tiktok\.com/i
};

function detectPlatform(url) {
  for (const [platform, regex] of Object.entries(PLATFORM_REGEX)) {
    if (regex.test(url)) return platform;
  }
  return null;
}

const Onboarding = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [socialLinks, setSocialLinks] = useState([{ url: '', platform: null }]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleUrlChange = (index, value) => {
    const updated = [...socialLinks];
    updated[index] = { url: value, platform: detectPlatform(value) };
    setSocialLinks(updated);
    setError('');
  };

  const addLink = () => {
    if (socialLinks.length < 4) {
      setSocialLinks([...socialLinks, { url: '', platform: null }]);
    }
  };

  const removeLink = (index) => {
    if (socialLinks.length > 1) {
      setSocialLinks(socialLinks.filter((_, i) => i !== index));
    }
  };

  const validLinks = socialLinks.filter(l => l.url.trim() && l.platform);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || validLinks.length === 0) return;

    setStatus('crawling');
    setError('');
    setProgress('Starting...');

    try {
      const urls = validLinks.map(l => l.url.trim());

      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), socialUrls: urls })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start onboarding');
      }

      const sessionId = data.sessionId;
      let attempts = 0;
      const maxAttempts = 45; // 45 * 2s = 90s (more time for multiple crawls)

      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/onboard/status/${sessionId}`);
          const statusData = await statusRes.json();

          setProgress(statusData.progress || 'Scraping profiles...');

          if (statusData.status === 'done') {
            clearInterval(poll);
            setProgress('Building your AI...');
            setTimeout(() => onComplete(sessionId), 1000);
          } else if (statusData.status === 'error') {
            clearInterval(poll);
            setStatus('error');
            setError(statusData.error || 'Crawl failed. Try different URLs or upload a photo.');
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            setStatus('error');
            setError('Timed out. Try again or upload a photo manually.');
          }
        } catch {
          clearInterval(poll);
          setStatus('error');
          setError('Connection lost. Please try again.');
        }
      }, 2000);

    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <h1 className="onboarding-title">Create Your AI Companion</h1>
        <p className="onboarding-subtitle">
          Link your social profiles — the more you add, the better your avatar
        </p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={status === 'crawling'}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Social Profiles</label>
            {socialLinks.map((link, index) => (
              <div key={index} className="social-link-row">
                <div className="social-input-wrap">
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder="https://facebook.com/yourprofile"
                    disabled={status === 'crawling'}
                    className="form-input"
                  />
                  {link.platform && (
                    <span className="detected-badge">{link.platform}</span>
                  )}
                </div>
                {socialLinks.length > 1 && status !== 'crawling' && (
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="remove-link-btn"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {socialLinks.length < 4 && status !== 'crawling' && (
              <button type="button" onClick={addLink} className="add-link-btn">
                + Add another profile
              </button>
            )}

            <PlatformSelector
              detected={socialLinks.map(l => l.platform).filter(Boolean)}
            />
          </div>

          {status === 'error' && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {status === 'crawling' ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{progress}</p>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!name.trim() || validLinks.length === 0}
              className="submit-btn"
            >
              Create My AI {validLinks.length > 1 ? `(${validLinks.length} profiles)` : ''}
            </button>
          )}
        </form>

        <p className="onboarding-disclaimer">
          Powered by AI — your companion is generated, not a real person.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
