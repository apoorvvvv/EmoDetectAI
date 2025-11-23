from deepface import DeepFace
import cv2

def detect_emotion(frame):
    try:

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        #emotion detection
        result = DeepFace.analyze(
            img_path=rgb_frame,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='opencv'
        )

        #DeepFace result
        if isinstance(result, list) and len(result)>0:
            dominant_emotion = result[0]['dominant_emotion']
            emotion_scores=result[0]['emotion']

            confidence =emotion_scores[dominant_emotion]/100.0

            region=result[0].get('region',{})
            annotated=frame.copy()

            if region:
                x,y,w,h =region.get(x, 0), region.get('y', 0), region.get('w', 0), region.get('h', 0)
                if w>0 and h>0:
                    cv2.rectangle(annotated,(x,y),(x+w, y+h), (0,255, 0), 2)

            text=f"{dominant_emotion}({confidence: .2f})"
            font= cv2.FONT_HERSHEY_SIMPLEX
            font_scale=1.0
            thickness=2

            (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)

            cv2.rectangle(annotated, (10, 10), (20 + text_width, 20 + text_height + baseline), 
                         (0, 0, 0), -1)
            
            cv2.putText(annotated, text, (15, 15 + text_height),
                       font, font_scale, (0, 255, 0), thickness)

            y_offset = 60
            for emotion, score in sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)[:3]:
                score_text = f"{emotion}: {score:.1f}%"
                cv2.putText(annotated, score_text, (15, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                y_offset += 25
            
            return dominant_emotion, annotated, confidence
        
        return None, frame, 0.0
        

    except Exception as e:
        print(f"Emotion detection failed: {e}")
        annotated=frame.copy()
        cv2.putText(annotated, "No face detected", (20, 40),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)

        return None, annotated, 0.0

