const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const DID_API_URL = 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY;

// Cache uploaded image URLs per session (avoid re-uploading)
const imageUrlCache = new Map();

async function uploadImageToDID(avatarPath, sessionId, tempDir) {
  // Check cache first
  if (imageUrlCache.has(sessionId)) {
    return imageUrlCache.get(sessionId);
  }

  const absolutePath = path.isAbsolute(avatarPath)
    ? avatarPath
    : path.join(tempDir, avatarPath);

  const form = new FormData();
  form.append('image', fs.createReadStream(absolutePath), {
    filename: 'avatar.jpg',
    contentType: 'image/jpeg'
  });

  console.log('[D-ID] Uploading image...');
  const res = await axios.post(
    `${DID_API_URL}/images`,
    form,
    {
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        ...form.getHeaders()
      },
      timeout: 30000
    }
  );

  const imageUrl = res.data.url;
  console.log(`[D-ID] Image uploaded: ${imageUrl}`);

  // Cache it
  imageUrlCache.set(sessionId, imageUrl);
  return imageUrl;
}

async function createTalkingVideo(text, avatarPath, sessionId, tempDir) {
  if (!DID_API_KEY) {
    throw new Error('DID_API_KEY not configured');
  }

  const sessionDir = path.join(tempDir, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Step 1: Upload image to D-ID (or use cached URL)
  let sourceUrl;
  try {
    sourceUrl = await uploadImageToDID(avatarPath, sessionId, tempDir);
  } catch (err) {
    const errData = err.response?.data;
    console.error('[D-ID] Image upload error:', JSON.stringify(errData, null, 2));
    throw new Error(`D-ID image upload failed: ${errData?.description || err.message}`);
  }

  // Truncate text if too long (D-ID has limits)
  const truncatedText = text.length > 900 ? text.substring(0, 900) + '...' : text;

  // Step 2: Create a talk
  console.log('[D-ID] Creating talk...');
  let createRes;
  try {
    createRes = await axios.post(
      `${DID_API_URL}/talks`,
      {
        source_url: sourceUrl,
        script: {
          type: 'text',
          input: truncatedText,
          provider: {
            type: 'microsoft',
            voice_id: 'en-US-GuyNeural'
          }
        },
        config: {
          fluent: true,
          pad_audio: 0.5
        }
      },
      {
        headers: {
          'Authorization': `Basic ${DID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
  } catch (err) {
    const errData = err.response?.data;
    console.error('[D-ID] Create talk error:', JSON.stringify(errData, null, 2));
    throw new Error(`D-ID create failed: ${errData?.description || errData?.message || err.message}`);
  }

  const talkId = createRes.data.id;
  console.log(`[D-ID] Talk created: ${talkId}`);

  // Step 3: Poll for completion
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusRes = await axios.get(
      `${DID_API_URL}/talks/${talkId}`,
      {
        headers: {
          'Authorization': `Basic ${DID_API_KEY}`
        },
        timeout: 10000
      }
    );

    const status = statusRes.data.status;
    console.log(`[D-ID] Talk ${talkId} status: ${status}`);

    if (status === 'done') {
      const videoUrl = statusRes.data.result_url;

      // Download video
      const videoRes = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const videoFilename = `response_${Date.now()}.mp4`;
      const videoPath = path.join(sessionDir, videoFilename);
      fs.writeFileSync(videoPath, Buffer.from(videoRes.data));

      console.log(`[D-ID] Video saved: ${videoPath}`);
      return {
        videoPath: `/temp/${sessionId}/${videoFilename}`,
        talkId
      };
    }

    if (status === 'error' || status === 'rejected') {
      throw new Error(`D-ID talk failed: ${statusRes.data.error?.description || status}`);
    }
  }

  throw new Error('D-ID talk timed out');
}

module.exports = { createTalkingVideo };
