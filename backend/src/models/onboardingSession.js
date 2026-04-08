const { v4: uuidv4 } = require('uuid');

const sessions = new Map();

function createSession(userName, socialUrl, platform) {
  const session = {
    sessionId: uuidv4(),
    userName,
    socialUrl,
    platform,
    status: 'pending',
    crawlResult: null,
    persona: null,
    createdAt: Date.now()
  };
  sessions.set(session.sessionId, session);
  return session;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function updateSession(sessionId, updates) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  Object.assign(session, updates);
  return session;
}

module.exports = { createSession, getSession, updateSession };
