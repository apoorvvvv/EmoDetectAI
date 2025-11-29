const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const uploadedImage = document.getElementById('uploaded-image');
const emotionIndicator = document.getElementById('emotion-indicator');
const moodEmoji = document.getElementById('mood-emoji');
const moodText = document.getElementById('mood-text');
const aiPrompt = document.getElementById('ai-prompt');
const recommendationBtn = document.getElementById('recommendation-btn');
const aiResponse = document.getElementById('ai-response');
const imageUpload = document.getElementById('image-upload');
const webcamBtn = document.getElementById('webcam-btn');
const statusDiv = document.getElementById('status');
const videoWrapper = document.getElementById('video-wrapper');

let currentEmotion = 'neutral';
let isWebcamMode = true;
let detectionInterval = null;

// Emojis for emotions
const emojis = {
  neutral: '😐',
  happy: '😄',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  fear: '😨',
  disgusted: '🤢',
  disgust: '🤢',
  surprised: '😲',
  surprise: '😲'
};

// Emotion colors for visual feedback
const emotionColors = {
  neutral: '#94a3b8',
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  fearful: '#f59e0b',
  fear: '#f59e0b',
  disgusted: '#a855f7',
  disgust: '#a855f7',
  surprised: '#ec4899',
  surprise: '#ec4899'
};

// Load face-api.js models
async function loadModels() {
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  try {
    videoWrapper.classList.add('loading');
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    
    videoWrapper.classList.remove('loading');
    statusDiv.textContent = 'Models loaded! Starting webcam...';
    startVideo();
  } catch (err) {
    console.error("Error loading models:", err);
    videoWrapper.classList.remove('loading');
    statusDiv.textContent = 'Error loading face detection models';
  }
}

function startVideo() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user'
    } 
  })
    .then(stream => {
      video.srcObject = stream;
      statusDiv.textContent = 'Webcam active - Face detection running';
      emotionIndicator.textContent = 'Detecting face...';
    })
    .catch(err => {
      console.error("Error accessing camera:", err);
      statusDiv.textContent = 'Error accessing camera - Please allow camera access';
    });
}

// Resize canvas to match video dimensions
function resizeCanvas() {
  const rect = video.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
}

// Emotion detection with face-api.js
async function detectEmotions() {
  if (video.paused || video.ended || !isWebcamMode) return;

  // Get actual video dimensions from the wrapper
  const wrapperRect = videoWrapper.getBoundingClientRect();
  const displaySize = { width: wrapperRect.width, height: wrapperRect.height };
  
  // Resize canvas to match wrapper
  overlay.width = displaySize.width;
  overlay.height = displaySize.height;

  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions();

  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  // Custom drawing for better visuals
  resizedDetections.forEach(detection => {
    const box = detection.detection.box;
    const expressions = detection.expressions;
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const color = emotionColors[dominant] || '#6366f1';
    
    // Draw rounded rectangle
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const radius = 10;
    ctx.moveTo(box.x + radius, box.y);
    ctx.lineTo(box.x + box.width - radius, box.y);
    ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + radius);
    ctx.lineTo(box.x + box.width, box.y + box.height - radius);
    ctx.quadraticCurveTo(box.x + box.width, box.y + box.height, box.x + box.width - radius, box.y + box.height);
    ctx.lineTo(box.x + radius, box.y + box.height);
    ctx.quadraticCurveTo(box.x, box.y + box.height, box.x, box.y + box.height - radius);
    ctx.lineTo(box.x, box.y + radius);
    ctx.quadraticCurveTo(box.x, box.y, box.x + radius, box.y);
    ctx.closePath();
    ctx.stroke();
    
    // Draw corner accents
    const cornerLength = 15;
    ctx.lineWidth = 4;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + cornerLength);
    ctx.lineTo(box.x, box.y);
    ctx.lineTo(box.x + cornerLength, box.y);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(box.x + box.width - cornerLength, box.y);
    ctx.lineTo(box.x + box.width, box.y);
    ctx.lineTo(box.x + box.width, box.y + cornerLength);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.height - cornerLength);
    ctx.lineTo(box.x, box.y + box.height);
    ctx.lineTo(box.x + cornerLength, box.y + box.height);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(box.x + box.width - cornerLength, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height - cornerLength);
    ctx.stroke();
  });

  if (detections.length > 0) {
    const expressions = detections[0].expressions;
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const confidence = sorted[0][1];

    updateMoodUI(dominant, confidence);
    sendEmotionToBackend(dominant, confidence);
  } else {
    emotionIndicator.textContent = 'No face detected';
  }
}

async function sendEmotionToBackend(emotion, confidence) {
  try {
    await fetch('/update_emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion, confidence })
    });
  } catch (error) {
    console.error('Error sending emotion to backend:', error);
  }
}

// UI update with animations
function updateMoodUI(emotion, confidence = 0.0) {
  if (currentEmotion === emotion) return;
  currentEmotion = emotion;
  
  // Update emoji with animation
  moodEmoji.style.transform = 'scale(0.5)';
  moodEmoji.style.opacity = '0';
  
  setTimeout(() => {
    moodEmoji.textContent = emojis[emotion] || '😐';
    moodEmoji.style.transform = 'scale(1)';
    moodEmoji.style.opacity = '1';
  }, 150);
  
  moodText.textContent = emotion;
  emotionIndicator.textContent = `${emotion} (${(confidence * 100).toFixed(0)}%)`;
  emotionIndicator.style.borderColor = emotionColors[emotion] || '#6366f1';

  const prompts = {
    sad: { text: "You seem a bit down. Want some cheering up?", btn: "Cheer Me Up 💙" },
    happy: { text: "You look great! Want to keep the vibes going?", btn: "Enhance Mood ✨" },
    angry: { text: "Take a deep breath. Need some calming suggestions?", btn: "Calm Down 🧘" },
    fearful: { text: "Feeling anxious? Let me help you relax.", btn: "Find Peace 🕊️" },
    fear: { text: "Feeling anxious? Let me help you relax.", btn: "Find Peace 🕊️" },
    disgusted: { text: "Something bothering you? Let's shift focus.", btn: "Fresh Perspective 🌿" },
    disgust: { text: "Something bothering you? Let's shift focus.", btn: "Fresh Perspective 🌿" },
    surprised: { text: "Surprised? Let's explore that feeling!", btn: "Explore More 🔮" },
    surprise: { text: "Surprised? Let's explore that feeling!", btn: "Explore More 🔮" },
    neutral: { text: "Feeling balanced. Want some inspiration?", btn: "Get Inspired 💡" },
    default: { text: `Detected: ${emotion}. Get personalized insights!`, btn: "Get AI Insights 🤖" }
  };
  
  const prompt = prompts[emotion] || prompts.default;
  aiPrompt.textContent = prompt.text;
  recommendationBtn.textContent = prompt.btn;
  recommendationBtn.disabled = false;
}

// Upload image and send to Flask backend
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  isWebcamMode = false;
  if (detectionInterval) clearInterval(detectionInterval);
  
  // Show preview
  uploadedImage.src = URL.createObjectURL(file);
  uploadedImage.style.display = 'block';
  video.style.opacity = '0';
  
  // Clear overlay
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  
  statusDiv.textContent = 'Processing with DeepFace...';
  emotionIndicator.textContent = 'Analyzing...';
  videoWrapper.classList.add('loading');

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/upload_image', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    videoWrapper.classList.remove('loading');

    if (data.emotion) {
      updateMoodUI(data.emotion, data.confidence);
      statusDiv.textContent = `DeepFace: ${data.emotion} (${(data.confidence * 100).toFixed(1)}% confidence)`;
      
      if (data.annotated_image) {
        uploadedImage.src = data.annotated_image;
      }
    } else {
      statusDiv.textContent = data.error || 'No face detected in image';
      emotionIndicator.textContent = 'No face found';
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    videoWrapper.classList.remove('loading');
    statusDiv.textContent = 'Error processing image';
    emotionIndicator.textContent = 'Error';
  }
}

// Switch back to webcam
function switchToWebcam() {
  isWebcamMode = true;
  uploadedImage.style.display = 'none';
  video.style.opacity = '1';
  
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusDiv.textContent = 'Webcam active - Face detection running';
  emotionIndicator.textContent = 'Detecting face...';
  
  // Reset file input
  imageUpload.value = '';
  
  if (!video.paused && !video.ended) {
    startDetectionLoop();
  }
}

// Get AI recommendation from backend
async function getRecommendation() {
  aiResponse.classList.add('show');
  aiResponse.innerHTML = '<p class="loading">🤔 Thinking...</p>';
  recommendationBtn.disabled = true;
  
  try {
    const response = await fetch('/get_recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion: currentEmotion })
    });
    
    const data = await response.json();
    
    if (data.recommendation) {
      // Format the response nicely
      const formattedText = data.recommendation
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      aiResponse.innerHTML = `<p>${formattedText}</p>`;
    } else if (data.error) {
      aiResponse.innerHTML = `<p>⚠️ ${data.error}</p>`;
    } else {
      aiResponse.innerHTML = '<p>Unable to get recommendation. Please try again.</p>';
    }
  } catch (error) {
    aiResponse.innerHTML = '<p>❌ Error connecting to AI. Please try again.</p>';
    console.error('Error:', error);
  } finally {
    recommendationBtn.disabled = false;
  }
}

function startDetectionLoop() {
  if (detectionInterval) clearInterval(detectionInterval);
  detectionInterval = setInterval(detectEmotions, 100);
}

// Event listeners
video.addEventListener('play', () => {
  resizeCanvas();
  startDetectionLoop();
});

window.addEventListener('resize', resizeCanvas);
imageUpload.addEventListener('change', handleImageUpload);
webcamBtn.addEventListener('click', switchToWebcam);
recommendationBtn.addEventListener('click', getRecommendation);

// Add transition styles to emoji
moodEmoji.style.transition = 'transform 0.3s ease, opacity 0.15s ease';

// Initialize
loadModels();