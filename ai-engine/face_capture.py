import cv2
import os

def capture_faces(user_id, num_images=20):
    dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dataset")
    user_dir = os.path.join(dataset_dir, user_id)

    if not os.path.exists(user_dir):
        os.makedirs(user_dir)

    cam = cv2.VideoCapture(0)
    # Using Haar Cascades for fast face detection during capture
    face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    print(f"\n[INFO] Initializing face capture for user {user_id}. Look at the camera and wait...")

    count = 0
    while True:
        ret, img = cam.read()
        if not ret:
            break

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_detector.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)
            count += 1
            
            # Save the captured face image
            file_path = os.path.join(user_dir, f"{count}.jpg")
            cv2.imwrite(file_path, gray[y:y+h, x:x+w])
            
            # Display image capture progess
            cv2.imshow('Face Capture', img)

        if cv2.waitKey(100) & 0xFF == 27: # Press 'ESC' to stop
            break
        elif count >= num_images:
             break

    print(f"\n[INFO] Successfully captured {count} faces for {user_id}. Exiting...")
    cam.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        capture_faces(sys.argv[1])
    else:
        print("Usage: python face_capture.py <USER_ID>")
