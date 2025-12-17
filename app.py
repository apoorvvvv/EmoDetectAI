from flask import Flask, render_template, Response, request, jsonify
from detection import detect_emotion
import cv2
import google.generativeai as genai
import os
import base64
import numpy as np
import traceback
from dotenv import load_dotenv

# load env vars
load_dotenv()

app = Flask(__name__)

# get api key
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found. AI features wont work")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# trying experimental model (may have different quota)
model = genai.GenerativeModel('gemini-exp-1206')

# store current emotion globally
current_emotion= {"emotion": "neutral", "confidence": 0.0}


@app.route('/')
def index():
    return render_template('index.html')

# receive emotion from frontend face-api 
@app.route('/update_emotion', methods=['POST'])
def update_emotion():
    data=request.json
    emotion=data.get('emotion')
    confidence= data.get('confidence', 0.0)

    if emotion:
        current_emotion["emotion"]= emotion
        current_emotion["confidence"]= confidence
        return jsonify({"status": "success"})
    
    return jsonify({"error": "emotion not retrieved"}), 400

@app.route('/current_emotion')
def get_current_emotion():
    return jsonify(current_emotion)

# handle image upload - uses deepface for detection
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        image_bytes = file.read()
        
        if not image_bytes or len(image_bytes) == 0:
            return jsonify({"error": "Empty file"}), 400
        
        # convert to opencv format
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Could not decode image"}), 400

        # run detection
        emotion, annotated, confidence = detect_emotion(img)

        if emotion:
            current_emotion["emotion"] = emotion
            current_emotion['confidence'] = float(confidence)

        # encode result as base64 to send back
        _, buffer = cv2.imencode('.jpg', annotated)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "emotion": emotion,
            "confidence": float(confidence),
            "annotated_image": f"data:image/jpeg;base64,{img_base64}"
        })

    except Exception as e:
        print(f"Upload Error: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# get ai recommendation using gemini
@app.route('/get_recommendation', methods=['POST'])
def get_recommendation():
    data=request.json
    emotion=data.get('emotion', current_emotion["emotion"])
    
    if not GEMINI_API_KEY:
        return jsonify({"error": "API key not configured"}), 500

    try:
        prompt = f"I am feeling {emotion}. Can you give me a short recommendation or quote to help me?"
        response = model.generate_content(prompt)
        return jsonify({"recommendation": response.text})
    except Exception as e:
        error_str = str(e)
        print(f"Gemini Error: {e}")
        
        # Fallback responses when quota is exceeded
        if "429" in error_str or "quota" in error_str.lower():
            fallback_responses = {
                "happy": "Keep spreading that positivity! Your joy is contagious. ✨",
                "sad": "It's okay to feel down sometimes. Take a deep breath and remember: this too shall pass. 💙",
                "angry": "Take a moment to breathe deeply. Count to 10. You've got this. 🧘",
                "fearful": "You are braver than you believe. Face your fears one step at a time. 🌟",
                "fear": "Courage is not the absence of fear, but taking action despite it. 💪",
                "disgusted": "Sometimes stepping away and focusing on something positive helps reset your perspective. 🌿",
                "disgust": "Focus on what brings you joy. The negative will fade. 🌸",
                "surprised": "Embrace the unexpected! Life's surprises often lead to the best adventures. 🎉",
                "surprise": "What a moment! Take it in and appreciate the wonder. ✨",
                "neutral": "A calm mind is a powerful mind. Use this clarity to set your intentions. 🧠"
            }
            fallback = fallback_responses.get(emotion, "Take a moment to reflect on your feelings. You're doing great! 💫")
            return jsonify({"recommendation": f"*AI temporarily unavailable*\n\n{fallback}"})
        
        return jsonify({"error": error_str}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
