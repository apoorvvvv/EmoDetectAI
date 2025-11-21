from deepface import DeepFace
import cv2

def detect_emotion(frame):
    try:

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        #emotion analysis
        result = DeepFace.analyze(
            img_path=rgb_frame,
            actions=['emotion'],
            enforce_detection=False
        )

        #DeepFace returns a list of results
        dominant_emotion = result[0]['dominant_emotion']

        annotated = frame.copy()
        cv2.putText(annotated, dominant_emotion, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)

        return dominant_emotion, annotated

    except Exception as e:
        print(f"Emotion detection failed: {e}")
        return None, frame

