import os
import cv2
import numpy as np
import pickle

def train_model():
    dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dataset")
    
    if not os.path.exists(dataset_dir):
        print(f"[ERROR] Dataset directory not found at {dataset_dir}")
        return

    print("\n[INFO] Training faces using LBPH. Please wait...")

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    faces = []
    ids = []
    id_map = {} # Maps numeric ID to userId string
    current_id = 0

    # Loop over each user folder in the dataset directory
    for user_id in os.listdir(dataset_dir):
        user_dir = os.path.join(dataset_dir, user_id)
        
        if not os.path.isdir(user_dir):
            continue

        print(f"[INFO] Processing user: {user_id}")
        id_map[current_id] = user_id
        
        for image_name in os.listdir(user_dir):
            image_path = os.path.join(user_dir, image_name)
            
            if not image_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue

            # Load image and convert to grayscale
            img = cv2.imread(image_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect faces in the training image
            detected_faces = face_detector.detectMultiScale(gray, 1.1, 5)
            
            for (x, y, w, h) in detected_faces:
                faces.append(gray[y:y+h, x:x+w])
                ids.append(current_id)
        
        current_id += 1

    if len(faces) == 0:
        print("[ERROR] No face data found to train.")
        return

    print(f"[INFO] Training on {len(faces)} face samples...")
    recognizer.train(faces, np.array(ids))
    
    # Save the model and the name map
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trainer.yml")
    labels_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "labels.pickle")
    
    recognizer.write(model_path)
    with open(labels_path, "wb") as f:
        pickle.dump(id_map, f)
        
    print(f"[INFO] Training finished model saved to {model_path}")

if __name__ == "__main__":
    train_model()
