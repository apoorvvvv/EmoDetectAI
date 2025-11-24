import cv2
import sys


def main() -> None:
    print("Opening webcam...")

    cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        print("If you're on a Mac or on Windows mode you can have any one of them but you need camera access, try changing cv2.VideoCapture(0) to cv2.VideoCapture(1)")
        sys.exit()

    while True:
        ret, frame = cap.read()

        if not ret:
            print("Error: Can't receive frame. Exiting...")
            break

        cv2.imshow('Webcam Test - Press Q to Quit', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("'q' key pressed. Closing webcam...")
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Webcam closed.")


if __name__ == "__main__":
    main()