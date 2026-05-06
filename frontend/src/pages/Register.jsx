import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        userId: '',
        email: '',
        parentEmail: '',
        phone: '',
        parentPhone: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);

    // Camera States
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedImages, setCapturedImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const startCamera = async () => {
        setCameraError(null);
        try {
            // Check if MediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Browser does *not* support camera access (Legacy or non-secure context).");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            let errMsg = "Could not access camera.";
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errMsg = "Camera permission denied. Please click the camera icon in the URL bar and 'Allow'.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                errMsg = "No camera hardware found on this device.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                errMsg = "Camera is already in use by another application (e.g. your Python AI script). Please close other apps using the camera.";
            } else {
                errMsg = err.message || "An unknown camera error occurred.";
            }
            setCameraError(errMsg);
            setStatus({ type: 'error', message: errMsg });
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            setIsCameraActive(false);
        }
    };

    const captureImage = () => {
        if (canvasRef.current && videoRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85);
            setCapturedImages(prev => [...prev, imageData]);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/register`, formData);
            setRegisterSuccess(true);
            setStatus({
                type: 'success',
                message: `User ${data.name} registered! Now allow camera access to capture 20 photos.`
            });
            // Try to start camera immediately
            setTimeout(startCamera, 500);
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.response?.data?.message || error.message
            });
            setLoading(false);
        }
    };

    const handleUploadImages = async () => {
        setIsUploading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/users/upload-images`, {
                userId: formData.userId,
                images: capturedImages
            });
            setStatus({ type: 'success', message: 'Face data registered successfully! You can now use the scanner.' });
            stopCamera();
            setCapturedImages([]);
            setRegisterSuccess(false);
            setFormData({ name: '', userId: '', email: '', parentEmail: '', phone: '', parentPhone: '' });
            setLoading(false);
        } catch (error) {
            console.error("Upload Error:", error);
            setStatus({
                type: 'error',
                message: error.response?.data?.message || 'Failed to upload images. Check server logs.'
            });
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (capturedImages.length === 20) {
            handleUploadImages();
        }
    }, [capturedImages]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white px-6 py-8 sm:px-10 sm:py-12 shadow-2xl rounded-3xl border border-gray-100">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-4">Student Enrollment</h2>
                    <p className="text-gray-500 text-lg font-medium">Create a profile and sync biometric face data.</p>
                </div>

                {status.message && (
                    <div className={`mb-8 p-5 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 ${status.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                        }`}>
                        <div className={`p-2 rounded-full ${status.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            {status.type === 'success' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                        </div>
                        <span className="font-semibold">{status.message}</span>
                    </div>
                )}

                {!registerSuccess ? (
                    <form onSubmit={handleRegister} className="space-y-8">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium" placeholder="Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Student ID</label>
                                <input type="text" name="userId" required value={formData.userId} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium" placeholder="ST101" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Phone</label>
                                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium" placeholder="9876543210" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Parent Phone</label>
                                <input type="tel" name="parentPhone" required value={formData.parentPhone} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium" placeholder="Parnent's Phone" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Student Email</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium" placeholder="student@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Parent Email (Free Alerts)</label>
                                <input type="email" name="parentEmail" required value={formData.parentEmail} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-800 font-medium" placeholder="parent@example.com" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-5 px-8 text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-black text-lg shadow-xl shadow-indigo-200 disabled:opacity-50">
                            {loading ? 'Processing...' : 'Proceed to Face Capture'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-8 flex flex-col items-center">
                        <div className="relative w-full max-w-md aspect-video bg-gray-950 rounded-[2.5rem] overflow-hidden shadow-px ring-8 ring-gray-900/5 group">
                            {cameraError ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-900 border-4 border-dashed border-rose-500/30 m-4 rounded-[2rem]">
                                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </div>
                                    <h3 className="text-white font-bold mb-2">Hardware Access required</h3>
                                    <p className="text-gray-400 text-sm mb-6 max-w-[250px]">{cameraError}</p>
                                    <button onClick={startCamera} className="px-6 py-2 bg-white text-gray-900 rounded-full font-bold hover:bg-indigo-50 transition-colors">
                                        Retry Camera
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute inset-x-0 top-0 h-2 bg-white/20">
                                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(capturedImages.length / 20) * 100}%` }}></div>
                                    </div>
                                    <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 text-white text-sm font-black">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        {capturedImages.length} / 20 SAMPLES
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-48 h-64 border-2 border-dashed border-white/30 rounded-[60px] relative">
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/10"></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-sm">
                            <button
                                onClick={captureImage}
                                disabled={capturedImages.length >= 20 || isUploading || cameraError}
                                className="py-5 px-8 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-indigo-300/50 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
                            >
                                {isUploading ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Saving Data...
                                    </span>
                                ) : `Capture Sample #${capturedImages.length + 1}`}
                            </button>
                            <div className="text-center space-y-1">
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest px-8">Guidance</p>
                                <p className="text-xs text-gray-400 font-medium">Slowly move your face side-to-side and up-down.</p>
                            </div>
                        </div>

                        {capturedImages.length > 0 && (
                            <div className="w-full mt-4">
                                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2">
                                    {capturedImages.map((img, i) => (
                                        <div key={i} className="relative flex-shrink-0 group">
                                            <img src={img} className="h-20 w-20 object-cover rounded-2xl border-4 border-white shadow-lg ring-1 ring-gray-100 group-hover:scale-105 transition-transform" />
                                            <div className="absolute -top-2 -right-2 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md">
                                                {i + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
