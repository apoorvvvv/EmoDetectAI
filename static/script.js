// dark/light mode
const themeToggle = document.getElementById('theme-toggle');
const themeIconLight = document.querySelector('.theme-icon-light');
const themeIconDark = document.querySelector('.theme-icon-dark');

function setTheme(isDark) {

  document.documentElement.style.transition = 'none';
  document.body.style.transition = 'none';

  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (themeIconLight && themeIconDark) {
    themeIconLight.style.display = isDark ? 'none' : 'block';
    themeIconDark.style.display = isDark ? 'block' : 'none';
  }
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // switching 
  requestAnimationFrame(() => {
    document.documentElement.style.transition = '';
    document.body.style.transition = '';
  });
}

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));

themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});

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

//emoticons based on emotions
const emojis = {
  neutral: ':-|',
  happy: ':-)',
  sad: ':-(',
  angry: 'X-(',
  fearful: ':-O',
  fear: ':-O',
  disgusted: ':-/',
  disgust: ':-/',
  surprised: ':-O',
  surprise: ':-O'
};

//box outline
const emotionColors = {
  neutral: '#94a3b8',
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  fearful: '#a855f7',
  fear: '#a855f7',
  disgusted: '#84cc16',
  disgust: '#84cc16',
  surprised: '#f59e0b',
  surprise: '#f59e0b'
};

//loading model
async function loadModels() {
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  emotionIndicator.textContent = 'Loading AI models...';
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    emotionIndicator.textContent = 'Models loaded!';
    statusDiv.textContent = 'Models ready. Starting webcam...';
    startWebcam();
  } catch (err) {
    console.error('Error loading models:', err);
    emotionIndicator.textContent = 'Error loading models';
    statusDiv.textContent = 'Error: ' + err.message;
  }
}


async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });
    video.srcObject = stream;
    statusDiv.textContent = 'Webcam active - Face detection running';
    emotionIndicator.textContent = 'Detecting face...';
  } catch (err) {
    console.error('Webcam error:', err);
    statusDiv.textContent = 'Webcam access denied. Try uploading an image instead.';
    emotionIndicator.textContent = 'No webcam';
  }
}

function resizeCanvas() {
  const rect = videoWrapper.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
}

window.addEventListener('resize', resizeCanvas);


let isDetecting = false;

async function detectEmotions() {
  if (video.paused || video.ended || !isWebcamMode || isDetecting) return;
  isDetecting = true;

  try {
    const rect = videoWrapper.getBoundingClientRect();
    const displaySize = { width: rect.width, height: rect.height };

    if (overlay.width !== displaySize.width || overlay.height !== displaySize.height) {
      overlay.width = displaySize.width;
      overlay.height = displaySize.height;
    }

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    const resized = faceapi.resizeResults(detections, displaySize);
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    resized.forEach(det => {
      const box = det.detection.box;
      const expressions = det.expressions;
      const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
      const dominant = sorted[0][0];
      const color = emotionColors[dominant] || '#6366f1';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const r = 10;
      ctx.moveTo(box.x + r, box.y);
      ctx.lineTo(box.x + box.width - r, box.y);
      ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + r);
      ctx.lineTo(box.x + box.width, box.y + box.height - r);
      ctx.quadraticCurveTo(box.x + box.width, box.y + box.height, box.x + box.width - r, box.y + box.height);
      ctx.lineTo(box.x + r, box.y + box.height);
      ctx.quadraticCurveTo(box.x, box.y + box.height, box.x, box.y + box.height - r);
      ctx.lineTo(box.x, box.y + r);
      ctx.quadraticCurveTo(box.x, box.y, box.x + r, box.y);
      ctx.closePath();
      ctx.stroke();


      const len = 15;
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(box.x, box.y + len);
      ctx.lineTo(box.x, box.y);
      ctx.lineTo(box.x + len, box.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(box.x + box.width - len, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + len);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.height - len);
      ctx.lineTo(box.x, box.y + box.height);
      ctx.lineTo(box.x + len, box.y + box.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(box.x + box.width - len, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height - len);
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
  } catch (err) {
    console.error("Detection error:", err);
  } finally {
    isDetecting = false;

    if (!video.paused && !video.ended && isWebcamMode) {
      setTimeout(detectEmotions, 200);
    }
  }
}


async function sendEmotionToBackend(emotion, confidence) {
  if (Math.random() > 0.1) return;
  try {
    await fetch('/update_emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion, confidence })
    });
  } catch (err) {
    console.error('Backend error:', err);
  }
}


function updateMoodUI(emotion, confidence = 0.0) {
  if (currentEmotion === emotion) return;
  currentEmotion = emotion;


  moodEmoji.textContent = emojis[emotion] || ':-|';
  moodText.textContent = emotion;
  emotionIndicator.textContent = emotion + ' (' + (confidence * 100).toFixed(0) + '%)';
  emotionIndicator.style.borderColor = emotionColors[emotion] || '#6366f1';

  //prompt based on emotion
  const prompts = {
    sad: { text: "You seem a bit down. Want some cheering up?", btn: "Cheer Me Up" },
    happy: { text: "You look great! Want to keep the vibes going?", btn: "Enhance Mood" },
    angry: { text: "Take a deep breath. Need some calming suggestions?", btn: "Calm Down" },
    fearful: { text: "Feeling anxious? Let me help you relax.", btn: "Find Peace" },
    fear: { text: "Feeling anxious? Let me help you relax.", btn: "Find Peace" },
    disgusted: { text: "Something bothering you? Let's shift focus.", btn: "Fresh Perspective" },
    disgust: { text: "Something bothering you? Let's shift focus.", btn: "Fresh Perspective" },
    surprised: { text: "Surprised? Let's explore that feeling!", btn: "Explore More" },
    surprise: { text: "Surprised? Let's explore that feeling!", btn: "Explore More" },
    neutral: { text: "Feeling balanced. Want some inspiration?", btn: "Get Inspired" },
    default: { text: "Detected: " + emotion + ". Get personalized insights!", btn: "Get AI Insights" }
  };

  const prompt = prompts[emotion] || prompts.default;
  aiPrompt.textContent = prompt.text;
  recommendationBtn.textContent = prompt.btn;
  recommendationBtn.disabled = false;
}

//for image upload
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  isWebcamMode = false;
  uploadedImage.src = URL.createObjectURL(file);
  uploadedImage.style.display = 'block';
  video.style.opacity = '0';

  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  statusDiv.textContent = 'Processing with DeepFace...';
  emotionIndicator.textContent = 'Analyzing...';
  videoWrapper.classList.add('loading');

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/upload_image', { method: 'POST', body: formData });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || 'HTTP ' + response.status);
    }

    const data = await response.json();
    videoWrapper.classList.remove('loading');

    if (data.emotion) {
      updateMoodUI(data.emotion, data.confidence);
      statusDiv.textContent = 'DeepFace: ' + data.emotion + ' (' + (data.confidence * 100).toFixed(1) + '%)';
      if (data.annotated_image) {
        uploadedImage.src = data.annotated_image;
      }
    } else {
      statusDiv.textContent = data.error || 'No face detected';
      emotionIndicator.textContent = 'No face found';
    }
  } catch (err) {
    console.error('Upload error:', err);
    videoWrapper.classList.remove('loading');
    statusDiv.textContent = 'Error: ' + err.message;
    emotionIndicator.textContent = 'Error';
  }
}


function switchToWebcam() {
  isWebcamMode = true;
  uploadedImage.style.display = 'none';
  video.style.opacity = '1';

  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusDiv.textContent = 'Webcam active - Face detection running';
  emotionIndicator.textContent = 'Detecting face...';
  imageUpload.value = '';

  if (!video.paused && !video.ended) {
    detectEmotions();
  }
}

//ai recommendation
async function getRecommendation() {
  aiResponse.classList.add('show');
  aiResponse.innerHTML = '<p class="loading">Thinking...</p>';
  recommendationBtn.disabled = true;

  try {
    const response = await fetch('/get_recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion: currentEmotion })
    });

    const data = await response.json();

    if (data.recommendation) {
      const formatted = data.recommendation
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      aiResponse.innerHTML = '<p>' + formatted + '</p>';
    } else if (data.error) {
      aiResponse.innerHTML = '<p>Error: ' + data.error + '</p>';
    } else {
      aiResponse.innerHTML = '<p>Unable to get recommendation.</p>';
    }
  } catch (err) {
    aiResponse.innerHTML = '<p>Error connecting to AI.</p>';
    console.error('Error:', err);
  } finally {
    recommendationBtn.disabled = false;
  }
}


video.addEventListener('play', () => {
  resizeCanvas();
  detectEmotions();
});

window.addEventListener('resize', resizeCanvas);
imageUpload.addEventListener('change', handleImageUpload);
webcamBtn.addEventListener('click', switchToWebcam);
recommendationBtn.addEventListener('click', getRecommendation);


loadModels();