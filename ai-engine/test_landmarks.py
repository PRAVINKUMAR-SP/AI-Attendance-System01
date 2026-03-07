import face_recognition
import cv2
import sys

def test_landmarks():
    print("Testing face_recognition landmarks...")
    try:
        # Try to load a dummy image or capture one frame
        cap = cv2.VideoCapture(0)
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            print("Could not capture frame")
            return

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_landmarks_list = face_recognition.face_landmarks(rgb_frame)
        
        if len(face_landmarks_list) > 0:
            print(f"Success! Detected landmarks for {len(face_landmarks_list)} faces.")
            for landmark in face_landmarks_list[0].keys():
                print(f" - Found landmark group: {landmark}")
        else:
            print("No faces detected in test frame.")
            
    except Exception as e:
        print(f"Error testing landmarks: {e}")

if __name__ == "__main__":
    test_landmarks()
