const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const MIN_SIZE = 256;
const IDEAL_SIZE = 512;
const DID_API_URL = 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY;

/**
 * Download, validate, and score ALL candidate images.
 * Then verify the top candidates with D-ID face detection.
 * Pick the best one that D-ID actually accepts.
 */
async function processBestImage(candidateImages, sessionId, tempDir) {
  const sessionDir = path.join(tempDir, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const outputPath = path.join(sessionDir, 'avatar.jpg');
  const validImages = [];
  const errors = [];

  console.log(`[Image] Evaluating ${candidateImages.length} candidates...`);

  // Step 1: Download and basic validation for ALL candidates
  for (let i = 0; i < candidateImages.length; i++) {
    const candidate = candidateImages[i];
    const imageUrl = typeof candidate === 'string' ? candidate : candidate.url;
    const source = typeof candidate === 'string' ? 'unknown' : (candidate.source || 'unknown');

    try {
      const result = await downloadAndValidate(imageUrl);
      console.log(`[Image] ✅ #${i + 1} [${source}]: ${result.width}x${result.height}`);
      validImages.push({
        index: i,
        url: imageUrl,
        source,
        buffer: result.buffer,
        width: result.width,
        height: result.height,
        pixels: result.pixels,
        aspectRatio: result.aspectRatio
      });
    } catch (err) {
      console.log(`[Image] ❌ #${i + 1} [${source}]: ${err.message}`);
      errors.push({ url: imageUrl, error: err.message });
    }
  }

  if (validImages.length === 0) {
    throw new Error(`All ${candidateImages.length} candidates failed basic validation.`);
  }

  // Step 2: Sort by quality score
  validImages.sort((a, b) => {
    const sourceBoostA = a.source === 'profile' ? 10 : (a.source === 'og' ? 2 : 1);
    const sourceBoostB = b.source === 'profile' ? 10 : (b.source === 'og' ? 2 : 1);
    const squarenessA = 1 - Math.abs(1 - a.aspectRatio) * 0.5;
    const squarenessB = 1 - Math.abs(1 - b.aspectRatio) * 0.5;
    const scoreA = a.pixels * squarenessA * sourceBoostA;
    const scoreB = b.pixels * squarenessB * sourceBoostB;
    return scoreB - scoreA;
  });

  console.log(`[Image] ${validImages.length} passed basic validation. All valid:`);  
  validImages.forEach((v, i) => {
    const sourceBoost = v.source === 'profile' ? 10 : (v.source === 'og' ? 2 : 1);
    const squareness = 1 - Math.abs(1 - v.aspectRatio) * 0.5;
    const score = v.pixels * squareness * sourceBoost;
    console.log(`  ${i + 1}. #${v.index + 1} [${v.source}] ${v.width}x${v.height} ratio=${v.aspectRatio.toFixed(2)} score=${Math.round(score)}`);
  });

  // Step 3: Try top candidates with D-ID face detection
  // Only test up to 5 to avoid burning API credits
  const topCandidates = validImages.slice(0, 5);

  for (const candidate of topCandidates) {
    try {
      // Save temp file for D-ID upload
      const tempPath = path.join(sessionDir, `candidate_${candidate.index}.jpg`);
      let image = sharp(candidate.buffer);
      if (candidate.width < MIN_SIZE || candidate.height < MIN_SIZE) {
        image = image.resize(IDEAL_SIZE, IDEAL_SIZE, { fit: 'cover', position: 'centre' });
      } else if (candidate.width > 1024 || candidate.height > 1024) {
        image = image.resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
      }
      await image.jpeg({ quality: 90 }).toFile(tempPath);

      // Test with D-ID
      if (DID_API_KEY) {
        const accepted = await testWithDID(tempPath);
        if (accepted) {
          // Winner! Copy to final path
          fs.copyFileSync(tempPath, outputPath);
          // Clean up temp candidates
          cleanupTempCandidates(sessionDir);
          console.log(`[Image] 🏆 D-ID accepted: #${candidate.index + 1} [${candidate.source}] ${candidate.width}x${candidate.height}`);
          return {
            path: outputPath,
            relativePath: `${sessionId}/avatar.jpg`,
            width: candidate.width,
            height: candidate.height,
            candidateIndex: candidate.index
          };
        } else {
          console.log(`[Image] 🚫 D-ID rejected: #${candidate.index + 1} — no usable face detected`);
        }
      } else {
        // No D-ID key — just use the top-scored one
        fs.copyFileSync(tempPath, outputPath);
        cleanupTempCandidates(sessionDir);
        console.log(`[Image] 🏆 Best (no D-ID check): #${candidate.index + 1} [${candidate.source}] ${candidate.width}x${candidate.height}`);
        return {
          path: outputPath,
          relativePath: `${sessionId}/avatar.jpg`,
          width: candidate.width,
          height: candidate.height,
          candidateIndex: candidate.index
        };
      }
    } catch (err) {
      console.log(`[Image] D-ID test failed for #${candidate.index + 1}: ${err.message}`);
    }
  }

  // Fallback: if D-ID rejected all top 5, use the highest scored one anyway
  const fallback = validImages[0];
  console.log(`[Image] ⚠️ D-ID rejected all top candidates. Using best-scored: #${fallback.index + 1} [${fallback.source}]`);
  let image = sharp(fallback.buffer);
  if (fallback.width < MIN_SIZE || fallback.height < MIN_SIZE) {
    image = image.resize(IDEAL_SIZE, IDEAL_SIZE, { fit: 'cover', position: 'centre' });
  } else if (fallback.width > 1024 || fallback.height > 1024) {
    image = image.resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
  }
  await image.jpeg({ quality: 90 }).toFile(outputPath);
  cleanupTempCandidates(sessionDir);

  return {
    path: outputPath,
    relativePath: `${sessionId}/avatar.jpg`,
    width: fallback.width,
    height: fallback.height,
    candidateIndex: fallback.index
  };
}

/**
 * Test an image with D-ID — upload and see if they accept it as a valid face.
 */
async function testWithDID(imagePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath), {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  });

  try {
    const res = await axios.post(`${DID_API_URL}/images`, form, {
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        ...form.getHeaders()
      },
      timeout: 15000
    });
    // If upload succeeds, D-ID found a usable face
    return !!res.data.url;
  } catch (err) {
    // 400 = bad image (no face, multiple faces, etc.)
    if (err.response?.status === 400) return false;
    throw err;
  }
}

function cleanupTempCandidates(sessionDir) {
  try {
    const files = fs.readdirSync(sessionDir);
    for (const file of files) {
      if (file.startsWith('candidate_')) {
        fs.unlinkSync(path.join(sessionDir, file));
      }
    }
  } catch {}
}

async function downloadAndValidate(imageUrl) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const buffer = Buffer.from(response.data);

  if (buffer.length < 5000) {
    throw new Error('Too small (likely placeholder)');
  }

  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Cannot read dimensions');
  }

  if (metadata.width < 100 || metadata.height < 100) {
    throw new Error(`Too small: ${metadata.width}x${metadata.height}`);
  }

  const aspectRatio = metadata.width / metadata.height;

  // Only reject extreme aspect ratios (banners)
  if (aspectRatio > 2.0) {
    throw new Error(`Too wide (${aspectRatio.toFixed(2)}:1) — banner`);
  }
  if (aspectRatio < 0.5) {
    throw new Error(`Too tall (${aspectRatio.toFixed(2)}:1)`);
  }

  return { buffer, width: metadata.width, height: metadata.height, pixels: metadata.width * metadata.height, aspectRatio };
}

async function processProfileImage(imageUrl, sessionId, tempDir) {
  return processBestImage([imageUrl], sessionId, tempDir);
}

module.exports = { processBestImage, processProfileImage };
