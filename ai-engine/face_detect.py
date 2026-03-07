import os
import cv2
import face_recognition
import numpy as np
import pickle
import requests
from datetime import datetime
import time

API_URL = "http://localhost:5000/api/attendance/mark"

def mark_attendance(name):
    """Send POST request to Node.js backend to mark attendance"""
    now = datetime.now()
    dt_string = now.strftime("%Y-%m-%d")
    time_string = now.strftime("%H:%M")
    
    data = {
        "userId": name,
        "date": dt_string,
        "time": time_string
    }
    
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code == 201:
            print(f"[SUCCESS] Marked attendance for {name} at {time_string}")
        elif response.status_code == 400:
            print(f"[INFO] Attendance already marked for {name} today.")
        else:
            print(f"[ERROR] Failed to mark attendance for {name}: {response.text}")
    except requests.exceptions.RequestException as e:
         print(f"[ERROR] API Request failed: {e}")

def detect_and_mark():
    encodings_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "encodings.pickle")
    
    if not os.path.exists(encodings_path):
        print("[ERROR] Encodings file not found. Please train the model first.")
        return

    print("[INFO] Loading encodings...")
    with open(encodings_path, "rb") as f:
        data = pickle.loads(f.read())
        
    known_face_encodings = data["encodings"]
    known_face_names = data["names"]

    print("[INFO] Starting video stream...")
    video_capture = cv2.VideoCapture(0)
    
    # Keeping track of recently marked people to avoid spamming the API continuously
    marked_today = set()

    while True:
        ret, frame = video_capture.read()
        if not ret:
            break

        # Resize frame of video to 1/4 size for faster face recognition processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        
        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # Find all the faces and face encodings in the current frame of video
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            # See if the face is a match for the known face(s)
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"

            # Use the known face with the smallest distance to the new face
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index] and face_distances[best_match_index] < 0.5:
                name = known_face_names[best_match_index]
                
                # If matched and not marked today in this session, trigger API
                if name not in marked_today:
                    mark_attendance(name)
                    marked_today.add(name)

            face_names.append(name)

        # Display the results
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Scale back up face locations since the frame we detected in was scaled to 1/4 size
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            # Draw a box around the face
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0) if name != "Unknown" else (0, 0, 255), 2)
            
            # Draw a label with a name below the face
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0) if name != "Unknown" else (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)

        cv2.imshow('Live Face Attendance System', frame)

        # Hit 'q' on the keyboard to quit!
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    detect_and_mark()
