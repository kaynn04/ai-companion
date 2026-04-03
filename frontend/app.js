const socket = io();

// Generate a session ID
const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);

// DOM Elements
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const characterImage = document.getElementById('character-image');
const characterVideo = document.getElementById('character-video');
const recordingOverlay = document.getElementById('recording-overlay');
const responseText = document.getElementById('response-text');

// Send message
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    userInput.value = '';
    userInput.disabled = true;
    sendButton.disabled = true;

    socket.emit('chat', { sessionId, message });
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Typing indicator
socket.on('typing', (data) => {
    if (data.status) {
        recordingOverlay.hidden = false;
    } else {
        recordingOverlay.hidden = true;
    }
});

// Text response (immediate)
socket.on('message', (data) => {
    responseText.textContent = data.text;
    responseText.hidden = false;

    // Re-enable input
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
});

// Media status updates
socket.on('media_status', (data) => {
    if (data.status === 'generating_voice') {
        recordingOverlay.querySelector('span').textContent = 'Generating voice...';
        recordingOverlay.hidden = false;
    } else if (data.status === 'generating_video') {
        recordingOverlay.querySelector('span').textContent = 'Generating video...';
        recordingOverlay.hidden = false;
    } else if (data.status === 'voice_failed' || data.status === 'video_failed') {
        recordingOverlay.hidden = true;
    }
});

// Audio ready
socket.on('audio_ready', (data) => {
    const audio = new Audio(data.audioUrl);
    audio.play().catch(err => console.log('Audio autoplay blocked:', err));
});

// Video ready — replace static image with video
socket.on('video_ready', (data) => {
    recordingOverlay.hidden = true;
    characterImage.hidden = true;
    characterVideo.src = data.videoUrl;
    characterVideo.hidden = false;
    characterVideo.play();

    // When video ends, go back to static image
    characterVideo.onended = () => {
        characterVideo.hidden = true;
        characterImage.hidden = false;
    };
});

// Connection status
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
