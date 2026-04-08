const express = require('express');
const multer = require('multer');
const path = require('path');
const { createSession, getSession, updateSession } = require('../models/onboardingSession');
const { detectPlatform, isValidProfileUrl, scrapeProfile } = require('../services/crawlerService');
const { processBestImage } = require('../services/imageProcessor');
const { generatePersona } = require('../services/personaGenerator');

const router = express.Router();
const upload = multer({ dest: 'temp/uploads/' });

const TEMP_DIR = path.join(__dirname, '..', '..', '..', 'temp');

// POST /api/onboard — start onboarding (supports multiple URLs)
router.post('/onboard', async (req, res) => {
  try {
    const { name, socialUrl, socialUrls } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Support both single URL (legacy) and multiple URLs
    let urls = [];
    if (socialUrls && Array.isArray(socialUrls)) {
      urls = socialUrls.filter(u => u && isValidProfileUrl(u));
    } else if (socialUrl && isValidProfileUrl(socialUrl)) {
      urls = [socialUrl];
    }

    if (urls.length === 0) {
      return res.status(400).json({ error: 'Please enter at least one valid social profile URL (Facebook, Instagram, X, or TikTok)' });
    }

    // Detect platforms for each URL
    const platforms = urls.map(u => ({ url: u, platform: detectPlatform(u) })).filter(p => p.platform);

    if (platforms.length === 0) {
      return res.status(400).json({ error: 'No supported platforms detected. Use Facebook, Instagram, X, or TikTok.' });
    }

    const session = createSession(name.trim(), urls[0], platforms[0].platform);
    updateSession(session.sessionId, {
      status: 'crawling',
      socialUrls: platforms, // Store all URLs
      progress: `Crawling ${platforms.length} profile(s)...`
    });

    // Kick off async multi-crawl
    runMultiCrawlPipeline(session.sessionId, platforms, name.trim());

    return res.json({ sessionId: session.sessionId, status: 'crawling' });
  } catch (err) {
    console.error('Onboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/onboard/status/:sessionId — poll status
router.get('/onboard/status/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  return res.json({
    sessionId: session.sessionId,
    status: session.status,
    progress: session.progress || null,
    crawlResult: session.crawlResult,
    persona: session.persona ? { name: session.persona.name } : null,
    error: session.error || null
  });
});

// POST /api/onboard/fallback/:sessionId — manual image upload
router.post('/onboard/fallback/:sessionId', upload.single('avatar'), async (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const sharp = require('sharp');
    const fs = require('fs');
    const sessionDir = path.join(TEMP_DIR, session.sessionId);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const outputPath = path.join(sessionDir, 'avatar.jpg');
    await sharp(req.file.path).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 90 }).toFile(outputPath);

    fs.unlinkSync(req.file.path);

    const persona = generatePersona({
      displayName: session.userName,
      bio: '',
      platform: session.platform || 'unknown'
    });

    updateSession(session.sessionId, {
      status: 'done',
      crawlResult: {
        profileImagePath: `${session.sessionId}/avatar.jpg`,
        displayName: session.userName,
        bio: ''
      },
      persona
    });

    return res.json({ sessionId: session.sessionId, status: 'done' });
  } catch (err) {
    console.error('Fallback upload error:', err);
    return res.status(500).json({ error: 'Failed to process uploaded image' });
  }
});

// Multi-crawl pipeline — scrapes all provided URLs, merges results
async function runMultiCrawlPipeline(sessionId, platforms, userName) {
  try {
    const allCandidateImages = [];
    let bestDisplayName = null;
    let bestBio = null;

    // Crawl each platform sequentially
    for (let i = 0; i < platforms.length; i++) {
      const { url, platform } = platforms[i];
      const label = `${platform} (${i + 1}/${platforms.length})`;

      updateSession(sessionId, {
        progress: `Scraping ${label}...`
      });

      console.log(`[Crawl] Scraping ${label}: ${url}`);

      try {
        const scraped = await scrapeProfile(url, platform);
        console.log(`[Crawl] ${label}: ${scraped.candidateImages?.length || 0} images, name: ${scraped.displayName}, bio: ${!!scraped.bio}`);

        // Collect candidate images from this platform
        if (scraped.candidateImages) {
          allCandidateImages.push(...scraped.candidateImages);
        }

        // Use the first available display name and bio
        if (!bestDisplayName && scraped.displayName) {
          bestDisplayName = scraped.displayName;
        }
        if (!bestBio && scraped.bio) {
          bestBio = scraped.bio;
        }
      } catch (err) {
        console.error(`[Crawl] ${label} failed: ${err.message}`);
        // Continue to next platform — don't fail everything
      }
    }

    console.log(`[Crawl] Total candidate images across all platforms: ${allCandidateImages.length}`);

    if (allCandidateImages.length === 0) {
      throw new Error('Could not find any images from the provided profiles');
    }

    // Deduplicate
    const uniqueImages = [...new Set(allCandidateImages)];

    updateSession(sessionId, {
      progress: `Selecting best image from ${uniqueImages.length} candidates...`
    });

    // Pick the best image
    const imageResult = await processBestImage(uniqueImages, sessionId, TEMP_DIR);
    const profileImagePath = imageResult.relativePath;
    console.log(`[Crawl] Best image: candidate #${imageResult.candidateIndex + 1} (${imageResult.width}x${imageResult.height})`);

    // Generate persona (merge bio from all platforms if needed)
    const displayName = bestDisplayName || userName;
    const persona = generatePersona({
      displayName,
      bio: bestBio || '',
      platform: platforms[0].platform
    });
    console.log(`[Crawl] Persona generated for: ${persona.name}`);

    updateSession(sessionId, {
      status: 'done',
      progress: 'Done!',
      crawlResult: {
        profileImagePath,
        displayName,
        bio: bestBio || ''
      },
      persona
    });

    console.log(`[Crawl] Session ${sessionId} complete`);
  } catch (err) {
    console.error(`[Crawl] Failed for session ${sessionId}:`, err.message);
    updateSession(sessionId, {
      status: 'error',
      error: err.message
    });
  }
}

module.exports = router;
