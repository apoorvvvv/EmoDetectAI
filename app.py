from flask import Flask, render_template, Response, request, jsonify
from detection import detect_emotion
import cv2
import google.generativeai as genai
import os
import base64
import numpy as np
import traceback # Import traceback
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

app = Flask(__name__)

# Securely get API key from environment variable
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables. AI features will not work.")

else:
    genai.configure(api_key=GEMINI_API_KEY)

# Use gemini-2.0-flash or a safe default if you prefer
model = genai.GenerativeModel('gemini-2.0-flash')

current_emotion= {"emotion": "neutral", "confidence": 0.0}




@app.route('/')
def index():
    return render_template('index.html')

#get detected emotion from face-api 
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

#image upload for deepface and emotion detection call
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file= request.files['image']

    try:
        image_bytes=file.read()
        nparr=np.frombuffer(image_bytes, np.uint8)
        img=cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
             raise ValueError("Could not decode image. File might be corrupted or unsupported format.")

        emotion, annotated, confidence= detect_emotion(img)

        if emotion:
            current_emotion["emotion"]= emotion
            current_emotion['confidence']= float(confidence)

        _, buffer = cv2.imencode('.jpg', annotated)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "emotion": emotion,
            "confidence": float(confidence),
            "annotated_image": f"data:image/jpeg;base64,{img_base64}"
        })

    except Exception as e:
        error_msg = str(e)
        tb = traceback.format_exc()
        print(f"Upload Error: {error_msg}\n{tb}")
        # Removed writing to file to keep things clean for deployment
        return jsonify({"error": error_msg}), 500

#ai recommendation from gemini
@app.route('/get_recommendation', methods=['POST'])
def get_recommendation():
    data=request.json
    emotion=data.get('emotion', current_emotion["emotion"])
    
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API Key not configured on server."}), 500

    try:
        prompt = f"I am feeling {emotion}. Can you give me a short recommendation or quote to help me?"
        response = model.generate_content(prompt)
        return jsonify({"recommendation": response.text})
    except Exception as e:
        print(f"Gemini Error: {e}") 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    default_port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=default_port, debug=True)
