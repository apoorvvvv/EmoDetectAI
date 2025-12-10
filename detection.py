from deepface import DeepFace
import cv2

def detect_emotion(frame):
    """
    takes a frame and returns the emotion detected
    uses deepface library with retinaface backend
    """
    try:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        #retinaface
        result = None
        try:
            result = DeepFace.analyze(
                img_path=rgb_frame,
                actions=['emotion'],
                enforce_detection=True,
                detector_backend='retinaface'
            )
        except:
            #opencv if retinaface does not work
            try:
                result = DeepFace.analyze(
                    img_path=rgb_frame,
                    actions=['emotion'],
                    enforce_detection=True,
                    detector_backend='opencv'
                )
            except Exception as e:
                print(f"No face found: {e}")
                result = None

        if result is None:
            annotated = frame.copy()
            cv2.putText(annotated, "No face detected", (20, 40),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
            return None, annotated, 0.0

        
        if isinstance(result, list) and len(result) > 0:
            emotion = result[0]['dominant_emotion']
            scores = result[0]['emotion']
            confidence = scores[emotion] / 100.0

            region = result[0].get('region', {})
            annotated = frame.copy()

            if region:
                x = region.get('x', 0)
                y = region.get('y', 0)
                w = region.get('w', 0)
                h = region.get('h', 0)
                
                if w > 0 and h > 0:
                    cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 0), 2)

            
            text = f"{emotion} ({confidence:.2f})"
            cv2.putText(annotated, text, (15, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)

            
            y_pos = 60
            for em, score in sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]:
                cv2.putText(annotated, f"{em}: {score:.1f}%", (15, y_pos),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                y_pos += 25
            
            return emotion, annotated, confidence
        
        return None, frame, 0.0

    except Exception as e:
        print(f"Detection error: {e}")
        annotated = frame.copy()
        cv2.putText(annotated, "No face detected", (20, 40),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
        return None, annotated, 0.0
