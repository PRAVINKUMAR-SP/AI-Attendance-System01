import { useState, useEffect, useRef } from 'react';

// Get faceapi from the global window object
// Relying on global window.faceapi
const LiveCamera = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [statusMessage, setStatusMessage] = useState('Initializing AI System...');
    const [faceMatcher, setFaceMatcher] = useState(null);
    const [markedToday, setMarkedToday] = useState(new Set());

    // Timer & Session States
    const [timeLeft, setTimeLeft] = useState(null);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionResults, setSessionResults] = useState({ present: 0, absent: 0, absentStudents: [] });

    // Technical Refs for real-time tracking (non-blocking)
    const processingRef = useRef(new Set());
    const usersMapRef = useRef(new Map());
    const livenessStateRef = useRef(new Map()); // Map<userId, { startTime: number, lastPos: {x,y}, staticFrames: number }>
    const frameCanvasRef = useRef(null); // Used for image processing (Laplacian)

    // Configuration
    const SPOOF_THRESHOLD = 30.0;
    const VERIFICATION_DURATION = 1500; // 1.5 seconds for fast CCTV
    const STATIC_THRESHOLD = 15; // frames

    // 1. Load Models & Initial Setup
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Wait for faceapi to be available on window (CDN load)
                let retries = 0;
                while ((!window.faceapi || !window.faceapi.nets) && retries < 10) {
                    await new Promise(res => setTimeout(res, 500));
                    retries++;
                }

                // Relying on CDN-loaded faceapi from window object
                const faceapi = window.faceapi;

                if (!faceapi || !faceapi.nets) {
                    console.error("face-api.js library or nets property not found.");
                    setCameraError('AI Library failed to load. Please check your internet and refresh.');
                    return;
                }
                setStatusMessage('Loading AI Vision Models...');
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

                await Promise.all([
                    window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                setIsModelsLoaded(true);
                // Create off-screen canvas for texture analysis
                frameCanvasRef.current = document.createElement('canvas');

                await loadRegisteredUsers();

                // Check for session auto-start
                const params = new URLSearchParams(window.location.search);
                if (params.get('session') === 'true') {
                    startCamera();
                    setTimeLeft(20); // 20 second session
                }
            } catch (error) {
                console.error("Error loading models:", error);
                setCameraError('AI Models failed to load.');
            }
        };
        loadModels();
    }, []);

    // 2. Laplacian Variance Helper (Ported from Python)
    const getLaplacianVariance = (video, box) => {
        const canvas = frameCanvasRef.current;
        const ctx = canvas.getContext('2d');

        // Extract Face ROI
        canvas.width = box.width;
        canvas.height = box.height;
        ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Grayscale conversion
        const gray = new Float32Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            gray[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }

        // Laplacian kernel
        const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
        let sum = 0;
        let sumSq = 0;
        const n = (width - 2) * (height - 2);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let lap = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        lap += gray[(y + ky) * width + (x + kx)] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                sum += lap;
                sumSq += lap * lap;
            }
        }

        const mean = sum / n;
        const variance = (sumSq / n) - (mean * mean);
        return variance;
    };

    const loadRegisteredUsers = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`);
            const users = await response.json();
            const registeredUsers = users.filter(user => user.faceDataRegistered);

            // Create a lookup map for names
            const map = new Map();
            registeredUsers.forEach(u => map.set(u.userId, u.name));
            usersMapRef.current = map;

            if (registeredUsers.length === 0) {
                setStatusMessage('No registered users found.');
                return;
            }

            const labeledFaceDescriptors = await Promise.all(
                registeredUsers.map(async (user) => {
                    const descriptions = [];
                    for (let i = 0; i < (user.faceImages?.length || 3); i++) {
                        try {
                            // Use Cloudinary URL if available, else fallback to local dataset
                            const imgUrl = user.faceImages && user.faceImages[i] 
                                ? user.faceImages[i] 
                                : `${import.meta.env.VITE_API_URL}/dataset/${user.userId}/${i + 1}.jpg`;
                            
                            const img = await window.faceapi.fetchImage(imgUrl);
                            const detection = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                            if (detection) descriptions.push(detection.descriptor);
                        } catch (err) { }
                    }
                    if (descriptions.length > 0) {
                        usersMapRef.current.set(user.userId, user.name);
                        return new window.faceapi.LabeledFaceDescriptors(user.userId, descriptions);
                    }
                    return null;
                })
            );

            const validDescriptors = labeledFaceDescriptors.filter(Boolean);
            if (validDescriptors.length > 0) {
                setFaceMatcher(new faceapi.FaceMatcher(validDescriptors, 0.5));
                setStatusMessage('AI Ready. CCTV Mode initialized.');
            }
        } catch (error) {
            setCameraError('Backend connection error.');
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 560 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }
        } catch (err) {
            setCameraError('Camera access denied.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCameraActive(false);
        }
    };

    // Timer Logic
    useEffect(() => {
        let timer;
        if (timeLeft !== null && timeLeft > 0 && isCameraActive) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isCameraActive) {
            handleSessionEnd();
        }
        return () => clearInterval(timer);
    }, [timeLeft, isCameraActive]);

    const handleSessionEnd = async () => {
        stopCamera();
        setStatusMessage('Session Expired. Processing Parent Alerts...');
        try {
            const now = new Date();
            const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
            const date = localDate.toISOString().split('T')[0];

            // Small delay to let DB settle before summary
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/process-absences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date })
            });
            const data = await response.json();

            setSessionResults({
                present: data.presentCount || 0,
                absent: data.absentCount || 0,
                absentStudents: data.absentStudents || []
            });
            setSessionComplete(true);
            setStatusMessage(`Finalized: ${data.presentCount || 0} Present, ${data.absentCount || 0} Absent.`);
        } catch (error) {
            console.error("Absence Processing Error:", error);
            setStatusMessage('Error processing absences.');
        }
    };

    const markAttendanceRecord = async (userId) => {
        if (markedToday.has(userId) || processingRef.current.has(userId)) return;
        processingRef.current.add(userId);

        try {
            const now = new Date();
            const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
            const date = localDate.toISOString().split('T')[0];
            const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/mark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, date, time })
            });

            if (response.ok || response.status === 400) {
                setMarkedToday(prev => new Set(prev).add(userId));
                const name = usersMapRef.current.get(userId) || userId;
                setStatusMessage(`SUCCESS: Attendance marked for ${name} ✅`);
                setTimeout(() => setStatusMessage('CCTV Mode Active'), 3000);
            }
        } catch (error) {
            console.error("Marking error:", error);
        } finally {
            processingRef.current.delete(userId);
        }
    };

    const handleVideoPlay = () => {
        if (!faceMatcher || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const displaySize = {
            width: videoRef.current.videoWidth || videoRef.current.offsetWidth,
            height: videoRef.current.videoHeight || videoRef.current.offsetHeight
        };

        // SAFETY: Don't process if dimensions are 0
        if (displaySize.width === 0 || displaySize.height === 0) {
            console.warn("Video dimensions not ready...");
            if (isCameraActive) requestAnimationFrame(handleVideoPlay);
            return;
        }

        window.faceapi.matchDimensions(canvasRef.current, displaySize);

        const loop = async () => {
            if (!isCameraActive || video.paused || video.ended) return;

            const detections = await window.faceapi.detectAllFaces(video, new window.faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resizedDetections = window.faceapi.resizeResults(detections, displaySize);
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);

            const activeIds = new Set();

            resizedDetections.forEach((detection, i) => {
                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                const userId = bestMatch.label;
                const box = detection.detection.box;
                const landmarks = detection.landmarks;

                if (userId === 'unknown') {
                    new faceapi.draw.DrawBox(box, { label: 'Unknown', boxColor: '#ef4444' }).draw(canvas);
                    return;
                }

                activeIds.add(userId);
                const studentName = usersMapRef.current.get(userId) || userId;

                // --- PASSIVE LIVENESS (Texture + Micro-Motion) ---
                const score = getLaplacianVariance(video, box);
                const nose = landmarks.getNose()[3];

                let state = livenessStateRef.current.get(userId) || {
                    startTime: Date.now(),
                    lastPos: nose,
                    staticFrames: 0,
                    livenessScore: score
                };

                // Micro-motion check
                const dist = Math.sqrt(Math.pow(nose.x - state.lastPos.x, 2) + Math.pow(nose.y - state.lastPos.y, 2));
                if (dist < 0.2) state.staticFrames++;
                else state.staticFrames = 0;

                state.lastPos = nose;
                state.livenessScore = score;

                const isStatic = state.staticFrames > STATIC_THRESHOLD;
                const isLowTexture = score < SPOOF_THRESHOLD;
                const isSpoof = isStatic && isLowTexture;

                let drawColor = '#f59e0b'; // Amber (Analyzing)
                let labelText = `Analyzing... ${Math.min(100, Math.floor(((Date.now() - state.startTime) / VERIFICATION_DURATION) * 100))}%`;

                if (isSpoof) {
                    drawColor = '#ef4444'; // Red
                    labelText = 'SPOOF DETECTED';
                    state.startTime = Date.now(); // Reset progress
                } else if (markedToday.has(userId)) {
                    drawColor = '#10b981'; // Green
                    labelText = `Verified: ${usersMapRef.current.get(userId)}`;
                } else if (Date.now() - state.startTime > VERIFICATION_DURATION) {
                    drawColor = '#10b981'; // Emerald (Verified)
                    labelText = `Verified: ${studentName}`;
                    markAttendanceRecord(userId);
                }

                livenessStateRef.current.set(userId, state);

                new faceapi.draw.DrawBox(box, {
                    label: labelText,
                    boxColor: drawColor,
                    drawLabelOptions: { fontSize: 16, padding: 8 }
                }).draw(canvas);

                // Calibration Detail
                context.fillStyle = isLowTexture ? '#ef4444' : '#10b981';
                context.font = '12px Inter';
                context.fillText(`Texture: ${Math.floor(score)}`, box.x, box.y + box.height + 20);
                context.fillStyle = '#9ca3af';
                context.fillText(`Static: ${state.staticFrames}/${STATIC_THRESHOLD}`, box.x, box.y + box.height + 35);
            });

            // Cleanup lost faces
            livenessStateRef.current.forEach((val, key) => {
                if (!activeIds.has(key)) livenessStateRef.current.delete(key);
            });

            if (isCameraActive) requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    };

    useEffect(() => () => stopCamera(), []);

    return (
        <div className="max-w-4xl mx-auto p-4">
            <header className="mb-6 text-center">
                <h1 className="text-2xl font-black text-gray-900">Passive AI Attendance</h1>
                <p className="text-gray-500 text-sm">CCTV Mode: Automatic Recognition & Liveness</p>
            </header>

            <div className="bg-white border rounded-2xl p-3 mb-6 shadow-sm flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    {statusMessage}
                </span>
                {cameraError && <span className="text-red-500 text-xs font-bold">{cameraError}</span>}
            </div>

            <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border-4 md:border-8 border-gray-900 mx-auto w-full max-w-[720px] aspect-[4/3]">
                <video ref={videoRef} autoPlay muted onPlay={handleVideoPlay} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

                {/* Live Indicator / Timer */}
                {isCameraActive && (
                    <div className="absolute top-4 right-4 flex items-center gap-3">
                        {timeLeft !== null && (
                            <div className="bg-black/60 backdrop-blur-md text-white text-sm font-black px-4 py-1.5 rounded-full border border-white/20 shadow-xl tabular-nums">
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                        )}
                        <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-2 shadow-lg animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            Live
                        </div>
                    </div>
                )}

                {/* Session Results Overlay */}
                {sessionComplete && (
                    <div className="absolute inset-x-0 bottom-0 top-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in slide-in-from-bottom duration-500 z-50">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-1">Session Complete</h2>
                        <p className="text-gray-500 text-sm mb-6">Parent alerts (SMS, Email, Voice) have been dispatched.</p>

                        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <div className="text-emerald-600 text-2xl font-black">{sessionResults.present}</div>
                                <div className="text-emerald-800 text-[10px] font-bold uppercase tracking-widest">Present</div>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                                <div className="text-rose-600 text-2xl font-black">{sessionResults.absent}</div>
                                <div className="text-rose-800 text-[10px] font-bold uppercase tracking-widest">Absent</div>
                            </div>
                        </div>

                        {sessionResults.absentStudents.length > 0 && (
                            <div className="w-full max-w-md mb-8 overflow-hidden">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 px-2">Manual Follow-up (Free Call Parent)</p>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {sessionResults.absentStudents.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100 group">
                                            <div className="text-left">
                                                <div className="text-sm font-bold text-gray-900 leading-none mb-1">{s.name}</div>
                                                <div className="text-[10px] font-medium text-gray-400 tracking-tight">{s.userId} • Parent: {s.parentPhone || 'No Phone'}</div>
                                            </div>
                                            {s.parentPhone && (
                                                <a
                                                    href={`tel:${s.parentPhone}`}
                                                    className="bg-white text-emerald-600 p-2 rounded-xl shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    Call Parent
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}

                {!isCameraActive && !sessionComplete && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                        <button onClick={startCamera} disabled={!faceMatcher} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
                            ENABLE CCTV SCANNER
                        </button>
                    </div>
                )}
            </div>

            {isCameraActive && (
                <div className="mt-8 flex justify-center">
                    <button onClick={stopCamera} className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest">
                        Deactivate Scanner
                    </button>
                </div>
            )}
        </div>
    );
};

export default LiveCamera;
