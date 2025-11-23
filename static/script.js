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

let currentEmotion = 'neutral';
let isWebcamMode = true;
let detectionInterval = null;

//emojis for emotions

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

//faceapi.js
async function loadModels() {
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    
    statusDiv.textContent = 'Models loaded! Starting webcam...';
    startVideo();
  } catch (err) {
    console.error("Error loading models:", err);
    statusDiv.textContent = 'Error loading face detection models';
  }
}

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
      statusDiv.textContent = 'Webcam active - Using Face-API.js';
    })
    .catch(err => {
      console.error("Error accessing camera:", err);
      statusDiv.textContent = 'Error accessing camera';
    });
}

//emotion detection
async function detectEmotions() {
  if (video.paused || video.ended || !isWebcamMode) return;

  const displaySize = { width: video.width, height: video.height };
  
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions();

  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  faceapi.draw.drawDetections(overlay, resizedDetections);
  faceapi.draw.drawFaceExpressions(overlay, resizedDetections);

  if (detections.length > 0) {
    const expressions = detections[0].expressions;
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const confidence = sorted[0][1];

    updateMoodUI(dominant, confidence);
    sendEmotionToBackend(dominant, confidence);
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

//UI update
function updateMoodUI(emotion, confidence = 0.0) {
  if (currentEmotion === emotion) return;
  currentEmotion = emotion;
  
  moodEmoji.textContent = emojis[emotion] || '😐';
  moodText.textContent = emotion;
  emotionIndicator.textContent = `${emotion} (${(confidence * 100).toFixed(0)}%)`;

  const prompts = {
    sad: { text: "You seem a bit down. Want some cheering up?", btn: "Cheer Me Up 💙" },
    happy: { text: "You look great! Want to keep the vibes going?", btn: "Enhance Mood ✨" },
    angry: { text: "Take a deep breath. Need some calming suggestions?", btn: "Calm Down 🧘" },
    fearful: { text: "Feeling anxious? Let me help you relax.", btn: "Find Peace 🕊️" },
    fear: { text: "Feeling anxious? Let me help you relax.", btn: "Find Peace 🕊️" },
    default: { text: `Detected: ${emotion}. Get personalized insights!`, btn: "Get AI Insights 🤖" }
  };
  
  const prompt = prompts[emotion] || prompts.default;
  aiPrompt.textContent = prompt.text;
  recommendationBtn.textContent = prompt.btn;
  recommendationBtn.disabled = false;
  
}


//upload image and send to flask
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  isWebcamMode = false;
  if (detectionInterval) clearInterval(detectionInterval);
  
  uploadedImage.src = URL.createObjectURL(file);
  uploadedImage.style.display = 'block';
  video.style.opacity = '0';
  
  statusDiv.textContent = 'Processing with DeepFace...';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/upload_image', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.emotion) {
      updateMoodUI(data.emotion, data.confidence);
      statusDiv.textContent = 'Image processed with DeepFace';
      
    
      if (data.annotated_image) {
        uploadedImage.src = data.annotated_image;
      }
    } else {
      statusDiv.textContent = 'No face detected in image';
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    statusDiv.textContent = 'Error processing image';
  }
}



//webcam button
function switchToWebcam() {
  isWebcamMode = true;
  uploadedImage.style.display = 'none';
  video.style.opacity = '1';
  
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusDiv.textContent = 'Webcam active - Using Face-API.js';
  
  if (!video.paused && !video.ended) {
    startDetectionLoop();
  }
}


//get recommendation from backend
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
      aiResponse.innerHTML = `<p>${data.recommendation}</p>`;
    } else {
      aiResponse.innerHTML = '<p>Unable to get recommendation. Please try again.</p>';
    }
  } catch (error) {
    aiResponse.innerHTML = '<p>Error connecting to AI. Please try again.</p>';
    console.error('Error:', error);
  } finally {
    recommendationBtn.disabled = false;
  }
}

function startDetectionLoop() {
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(overlay, displaySize);

  if (detectionInterval) clearInterval(detectionInterval);
  detectionInterval = setInterval(detectEmotions, 100);
}

video.addEventListener('play', startDetectionLoop);
imageUpload.addEventListener('change', handleImageUpload);
webcamBtn.addEventListener('click', switchToWebcam);
recommendationBtn.addEventListener('click', getRecommendation);

loadModels();