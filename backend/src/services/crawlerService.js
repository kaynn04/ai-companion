const puppeteer = require('puppeteer');

const PLATFORMS = {
  facebook: /facebook\.com/i,
  instagram: /instagram\.com/i,
  twitter: /(x\.com|twitter\.com)/i,
  tiktok: /tiktok\.com/i
};

function detectPlatform(url) {
  for (const [platform, regex] of Object.entries(PLATFORMS)) {
    if (regex.test(url)) return platform;
  }
  return null;
}

function isValidProfileUrl(url) {
  try {
    const parsed = new URL(url);
    return Object.values(PLATFORMS).some(r => r.test(parsed.hostname));
  } catch {
    return false;
  }
}

async function scrapeProfile(url, platform) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // Extract profile data
    let result = await extractPlatformSpecific(page, platform, browser);
    const ogData = await extractOpenGraph(page);

    // Build candidate image list with source tags
    // For Facebook: ONLY use profile photo + og:image. Skip all page images.
    // Page images on FB are too noisy (cover photos, promotions, group shots).
    const candidateImages = [];

    // 1. OpenGraph image FIRST — upgrade to high-res
    if (ogData.image) {
      let ogUrl = ogData.image;
      // Upgrade IG/FB thumbnail URLs to 720x720
      const upgraded = ogUrl.replace(/s\d+x\d+/, 's720x720');
      candidateImages.push({ url: upgraded, source: 'og' });
      if (upgraded !== ogUrl) {
        candidateImages.push({ url: ogUrl, source: 'og' }); // original as fallback
      }
    }

    // 2. Direct profile photo element
    if (result.imageUrl) {
      candidateImages.push({ url: result.imageUrl, source: 'profile' });
    }

    // 3. High-res profile photos from clicking
    if (result.highResImages && result.highResImages.length > 0) {
      result.highResImages.forEach(url => candidateImages.push({ url, source: 'profile' }));
    }

    // 4. Other page images — DISABLED
    // Post images from any platform are too unreliable for face detection
    // Only profile photos and og:image are used
    // if (result.imageUrls && result.imageUrls.length > 0) { ... }

    // Deduplicate by URL
    const seen = new Set();
    const uniqueImages = candidateImages.filter(c => {
      if (!c.url || seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });

    if (uniqueImages.length === 0) {
      throw new Error('Could not find any profile images from this URL');
    }

    console.log(`[Crawler] Found ${uniqueImages.length} candidate image(s)`);

    return {
      candidateImages: uniqueImages,
      displayName: result.displayName || ogData.title,
      bio: result.bio || ogData.description
    };
  } catch (err) {
    throw new Error(`Scrape failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function extractPlatformSpecific(page, platform, browser) {
  const result = { imageUrl: null, imageUrls: [], highResImages: [], displayName: null, bio: null };

  try {
    switch (platform) {
      case 'facebook':
        // Get display name
        result.displayName = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);

        // Strategy 1: Find the PROFILE PHOTO specifically (circular avatar, not cover)
        // Facebook profile photos are inside an SVG with a circle mask
        try {
          // The profile photo on modern FB is an <image> tag inside an SVG with a circular clip
          // Or it's inside a link that goes to /photo/ or has aria-label about profile
          const profilePicUrl = await page.evaluate(() => {
            // Method A: SVG image element (modern FB uses SVG with circular mask for profile pic)
            const svgImages = document.querySelectorAll('svg image');
            for (const img of svgImages) {
              const href = img.getAttribute('xlink:href') || img.getAttribute('href');
              if (href && href.includes('scontent')) {
                // Check if it's inside a circular container (profile pic indicator)
                const parent = img.closest('svg');
                if (parent) {
                  const circle = parent.querySelector('circle, clipPath');
                  if (circle) return href; // Has circular clip = profile photo
                }
              }
            }

            // Method B: img with specific profile photo attributes
            const profileImgs = document.querySelectorAll('img[data-imgperflogname="profilePhoto"], img[alt*="profile"]');
            for (const img of profileImgs) {
              if (img.src && img.src.includes('scontent')) return img.src;
            }

            // Method C: Look for images inside links that point to profile photo pages
            const links = document.querySelectorAll('a[href*="/photo"], a[href*="profile_pic"]');
            for (const link of links) {
              const img = link.querySelector('img');
              if (img && img.src && img.src.includes('scontent')) return img.src;
            }

            return null;
          });

          if (profilePicUrl) {
            console.log('[Crawler/FB] Found profile photo URL directly');
            // Modify the URL to get highest resolution version
            // FB URLs with s200x200 can be changed to s720x720
            const highRes = profilePicUrl
              .replace(/s\d+x\d+/, 's720x720')
              .replace(/cp0_dst/, 'dst');
            result.imageUrl = highRes;
          }
        } catch (err) {
          console.log(`[Crawler/FB] Profile photo strategy failed: ${err.message}`);
        }

        // Strategy 2: Also grab other photos from the profile (posts, albums)
        // Tagged as 'page' so they get lower priority than profile photos
        result.imageUrls = await page.$$eval('img', imgs =>
          imgs
            .map(img => ({ src: img.src, w: img.naturalWidth || 0, h: img.naturalHeight || 0 }))
            .filter(i => i.src && i.src.includes('scontent') && !i.src.includes('emoji') && !i.src.includes('static'))
            .filter(i => i.w === 0 || i.w >= 200) // Skip tiny thumbnails
            .sort((a, b) => (b.w * b.h) - (a.w * a.h))
            .map(i => i.src)
        ).catch(() => []);

        break;

      case 'instagram':
        result.displayName = await page.$eval(
          'header h2, header h1',
          el => el.textContent.trim()
        ).catch(() => null);
        result.bio = await page.$eval(
          'header section span, div[class*="biography"] span',
          el => el.textContent.trim()
        ).catch(() => null);

        // IG is fully JS-rendered — header images often don't load for Puppeteer
        // The og:image is the most reliable source (handled in main scrapeProfile)
        // No page images — they don't render anyway
        result.imageUrl = null;
        result.imageUrls = [];
        break;

      case 'twitter':
        result.imageUrl = await page.$eval(
          'img[src*="profile_images"]',
          el => el.src.replace('_normal', '_400x400')
        ).catch(() => null);
        result.displayName = await page.$eval(
          '[data-testid="UserName"] span',
          el => el.textContent.trim()
        ).catch(() => null);
        result.bio = await page.$eval(
          '[data-testid="UserDescription"]',
          el => el.textContent.trim()
        ).catch(() => null);
        break;

      case 'tiktok':
        result.displayName = await page.$eval(
          'h1[data-e2e="user-title"], h2.share-title',
          el => el.textContent.trim()
        ).catch(() => null);
        result.bio = await page.$eval(
          'h2[data-e2e="user-bio"], h2.share-desc',
          el => el.textContent.trim()
        ).catch(() => null);
        // Only the avatar image
        result.imageUrl = await page.$eval(
          'img[class*="avatar" i], img[class*="Avatar" i], span[class*="avatar" i] img',
          img => img.src
        ).catch(() => null);
        result.imageUrls = [];
        break;
    }
  } catch {
    // Swallow — fall back to OpenGraph
  }

  return result;
}

async function extractOpenGraph(page) {
  return await page.evaluate(() => {
    const getMeta = (property) => {
      const el = document.querySelector(
        `meta[property="${property}"], meta[name="${property}"]`
      );
      return el ? el.getAttribute('content') : null;
    };
    return {
      image: getMeta('og:image'),
      title: getMeta('og:title'),
      description: getMeta('og:description') || getMeta('description')
    };
  });
}

module.exports = { detectPlatform, isValidProfileUrl, scrapeProfile };
