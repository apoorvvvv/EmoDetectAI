from flask import Flask, render_template, Response
from camera import VideoCamera
from detection import detect_emotion
import cv2

app = Flask(__name__)

def gen(camera):
    frame_count = 0
    last_emotion = "Analyzing..."
    last_annotated = None

    while True:
        frame = camera.get_frame()
        if frame is None:
            continue

        #converting bytes to numpy array again
        frame_np = camera.frame  

        if frame_count % 30 == 0:
            emotion, annotated = detect_emotion(frame_np)
            if emotion:
                last_emotion = emotion
                last_annotated = annotated
        else:
            annotated = frame_np.copy()
            if last_emotion:
                cv2.putText(annotated, last_emotion, (20, 40),
                           cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
                
        frame_count +=1     
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
