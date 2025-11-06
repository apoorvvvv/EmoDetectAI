from flask import Flask, render_template, Response
from camera import VideoCamera
from detection import detect_emotion
import cv2

app = Flask(__name__)

def gen(camera):
    while True:
        frame = camera.get_frame()
        if frame is None:
            continue

        # Convert bytes back to numpy array for DeepFace
        frame_np = camera.frame  

        # Run emotion detection every nth frame (to save CPU)
        emotion, annotated = detect_emotion(frame_np)

        # Encode for streaming
        _, jpeg = cv2.imencode('.jpg', annotated)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen(VideoCamera()),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
