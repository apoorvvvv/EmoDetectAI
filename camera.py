import cv2

class VideoCamera:
    def __init__(self):
        self.video = cv2.VideoCapture(1)

    def __del__(self):
        if self.video.isOpened():
            self.video.release()

    def get_frame(self):
        ret, frame = self.video.read()
        if not ret:
            return None
        _, jpeg = cv2.imencode('.jpg', frame)
        return jpeg.tobytes()
