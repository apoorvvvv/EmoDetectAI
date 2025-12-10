from flask import Flask, render_template, Response, request, jsonify
from detection import detect_emotion
import cv2
import google.generativeai as genai
import os
import base64
import numpy as np
import traceback
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)


GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found. AI features wont work")
else:
    genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel('gemini-2.5-flash')

# storing emotion globally
current_emotion= {"emotion": "neutral", "confidence": 0.0}


@app.route('/')
def index():
    return render_template('index.html')

#get emotion from frontend face-api 
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

# for image upload (deepface for detection)
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
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Could not decode image"}), 400

        # detection
        emotion, annotated, confidence = detect_emotion(img)

        if emotion:
            current_emotion["emotion"] = emotion
            current_emotion['confidence'] = float(confidence)

        #base64
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

#ai recommendation and quotes
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
        print(f"Gemini Error: {e}") 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
