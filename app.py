from flask import Flask, render_template, Response, request, jsonify
from detection import detect_emotion
import cv2
import google.generativeai as genai
import os
import base64
import numpy as np


app = Flask(__name__)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyD7rvccbyjcPf5T2cugo6dNnypxAePPaBc')
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

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
        
        emotion, annotated, confidence= detect_emotion(img)

        if emotion:
            current_emotion["emotion"]= emotion
            current_emotion['confidence']= confidence

        _, buffer = cv2.imencode('.jpg', annotated)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "emotion": emotion,
            "confidence": confidence,
            "annotated_image": f"data:image/jpeg;base64,{img_base64}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

#ai recommendation from gemini
@app.route('/get_reccomendation', methods=['POST'])
def get_recommendation():
    data=request.json
    emotion=data.get('emotion', current_emotion["emotion"])

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
