import { useState } from 'react';

const CameraView = () => {
    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Live Attendance System</h1>
                <p className="mt-3 text-lg text-gray-500">
                    The camera system is powered by our high-performance Python AI Engine.
                </p>
            </div>

            <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="p-8 sm:p-10">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div className="w-full md:w-1/2">
                            <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center border-4 border-gray-800 shadow-inner relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
                                <div className="text-center">
                                    <svg className="mx-auto h-16 w-16 text-gray-600 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-4 text-sm text-gray-400 font-medium">Camera hardware managed by OpenCV</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">How to launch the AI Camera</h3>
                                <p className="mt-2 text-gray-600">The face recognition runs natively using Python and OpenCV for maximum performance and hardware acceleration.</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 w-full">
                                <h4 className="font-mono text-sm font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">Terminal Execution</h4>
                                <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-600 font-mono">
                                    <li>cd AI-Attendance-System/ai-engine</li>
                                    <li>python face_detect.py</li>
                                </ol>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <svg className="h-6 w-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h4 className="text-sm font-semibold text-indigo-900">Automation Trigger</h4>
                                    <p className="mt-1 text-sm text-indigo-700">Once the Python script recognizes a registered face, it will automatically connect to this dashboard and mark the status as Present.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraView;
