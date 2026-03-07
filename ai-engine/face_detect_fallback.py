import os
import cv2
import numpy as np
import requests
import pickle
import random
import time
from datetime import datetime

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

def get_liveness_score(face_roi):
    """Passive liveness using Laplacian variance (texture analysis)"""
    gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
    return laplacian_var

def detect_and_mark_fallback():
    # Load classifiers
    face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Load LBPH Recognizer
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    base_path = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_path, "trainer.yml")
    labels_path = os.path.join(base_path, "labels.pickle")
    
    if not os.path.exists(model_path) or not os.path.exists(labels_path):
        print("[ERROR] AI Model not found. Please run face_train.py first.")
        return
        
    recognizer.read(model_path)
    with open(labels_path, "rb") as f:
        id_map = pickle.load(f)

    print("[INFO] Starting Hybrid Passive Liveness (CCTV Mode)...")
    video_capture = cv2.VideoCapture(0)
    
    # Calibration & Hybrid Settings (Optimized for Speed)
    SPOOF_THRESHOLD = 30.0    # Lowered to 30 (Real skin usually >35, Screens <25)
    STATIC_THRESHOLD = 25      # Reduced for faster spoof check
    IDENTIFICATION_THRESHOLD = 50.0 
    VERIFICATION_DURATION = 1.5 # Reduced from 3.0 to 1.5 seconds for CCTV speed
    
    # Per-user State
    verification_timer = {}    # userId -> startTime
    static_frame_count = {}    # userId -> count
    last_positions = {}        # userId -> (x, y)
    marked_today = set()

    while True:
        ret, frame = video_capture.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_detector.detectMultiScale(gray, 1.3, 5)

        current_visible_users = set()

        for (x, y, w, h) in faces:
            face_roi = frame[y:y+h, x:x+w]
            face_gray = gray[y:y+h, x:x+w]
            
            # 1. AI Identification
            label_id, confidence = recognizer.predict(face_gray)
            user_id = id_map.get(label_id, "Unknown")
            
            if user_id == "Unknown" or confidence > IDENTIFICATION_THRESHOLD:
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                cv2.putText(frame, "Unknown User", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                continue

            current_visible_users.add(user_id)

            # 2. Passive Liveness Check (Texture)
            liveness_score = get_liveness_score(face_roi)
            
            # 3. Micro-Motion Check (Layer 2)
            curr_pos = (x + w/2, y + h/2)
            if user_id in last_positions:
                dist = np.sqrt((curr_pos[0] - last_positions[user_id][0])**2 + 
                               (curr_pos[1] - last_positions[user_id][1])**2)
                if dist < 0.3: # Face is extremely static (photo/screen)
                    static_frame_count[user_id] = static_frame_count.get(user_id, 0) + 1
                else:
                    static_frame_count[user_id] = 0
            
            last_positions[user_id] = curr_pos

            # 4. Hybrid Decision (Low Texture + Static = Spoof)
            is_static = static_frame_count.get(user_id, 0) > STATIC_THRESHOLD
            is_low_texture = liveness_score < SPOOF_THRESHOLD
            
            # A spoof is detected ONLY if texture is low AND the person is too static
            is_spoof = is_low_texture and is_static
            
            status_text = "Analyzing..."
            status_color = (255, 255, 0) # Yellow
            
            if is_spoof:
                status_text = "SPOOF DETECTED (STATIC)"
                status_color = (0, 0, 255) # Red
                verification_timer[user_id] = time.time() # Reset progress
            elif user_id not in marked_today:
                if user_id not in verification_timer:
                    verification_timer[user_id] = time.time()
                
                elapsed = time.time() - verification_timer[user_id]
                progress = min(100, int((elapsed / VERIFICATION_DURATION) * 100))
                
                if elapsed >= VERIFICATION_DURATION:
                    status_text = f"VERIFIED: {user_id}"
                    status_color = (0, 255, 0)
                    print(f"[SUCCESS] Attendance for {user_id}")
                    mark_attendance(user_id)
                    marked_today.add(user_id)
                else:
                    status_text = f"Verifying {progress}%"
            else:
                status_text = f"Present: {user_id}"
                status_color = (0, 255, 0)

            # UI Overlays
            cv2.rectangle(frame, (x, y), (x + w, y + h), status_color, 2)
            cv2.putText(frame, status_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
            
            # Calibration Overlay (VERY IMPORTANT)
            score_color = (0, 255, 0) if liveness_score >= SPOOF_THRESHOLD else (0, 0, 255)
            cv2.putText(frame, f"Texture: {int(liveness_score)}", (x, y + h + 25), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, score_color, 1)
            cv2.putText(frame, f"Static Factor: {static_frame_count.get(user_id, 0)}/{STATIC_THRESHOLD}", 
                        (x, y + h + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Handle users who are no longer visible
        users_to_remove = [uid for uid in verification_timer if uid not in current_visible_users]
        for uid in users_to_remove:
            verification_timer.pop(uid, None)
            static_frame_count.pop(uid, None)
            last_positions.pop(uid, None)

        # Global Header
        cv2.rectangle(frame, (0, 0), (640, 50), (30, 30, 30), cv2.FILLED)
        cv2.putText(frame, "AI ATTENDANCE - CALIBRATED HYBRID LIVENESS", (40, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.imshow('Calibrated CCTV Attendance', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        if cv2.waitKey(1) & 0xFF == ord('r'):
            marked_today.clear()
            verification_timer.clear()
            static_frame_count.clear()
            last_positions.clear()

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    detect_and_mark_fallback()
