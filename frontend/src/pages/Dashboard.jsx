import { useState, useEffect } from 'react';

const Dashboard = () => {
    const [attendance, setAttendance] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ presentToday: 0, absentToday: 0, totalUsers: 0 });
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualData, setManualData] = useState({ userId: '', date: new Date().toISOString().split('T')[0], time: '' });
    const [actionLoading, setActionLoading] = useState(false);

    // Session Timer States
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(20); // 20 seconds session
    const [sessionStatus, setSessionStatus] = useState('Idle'); // Idle, Active, Finished

    const fetchDashboardData = async () => {
        try {
            const [attendanceRes, usersRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/api/attendance`),
                fetch(`${import.meta.env.VITE_API_URL}/api/users`)
            ]);

            const attendanceData = await attendanceRes.json();
            const usersData = await usersRes.json();

            setAttendance(attendanceData);
            setUsers(usersData);

            // Calculate quick stats
            const now = new Date();
            const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
            const today = localDate.toISOString().split('T')[0];
            
            // Count unique userIds for today's "Present" status
            const uniquePresentIds = new Set(
                attendanceData
                    .filter(record => record.date === today && record.status === 'Present')
                    .map(record => record.userId)
            );
            const presentToday = uniquePresentIds.size;
            
            // Absent today are those who have a literal "Absent" record OR 
            // students who are simply missing from the present list
            const uniqueAbsentIdsFromDB = new Set(
                attendanceData
                    .filter(record => record.date === today && record.status === 'Absent')
                    .map(record => record.userId)
            );
            
            // We use the larger of the two counts for a more accurate 'Absent' representation
            const absentToday = Math.max(uniqueAbsentIdsFromDB.size, usersData.length - presentToday);

            setStats({
                presentToday,
                absentToday,
                totalUsers: usersData.length
            });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 10000); // 10s refresh for stability
        return () => clearInterval(interval);
    }, []);

    // Timer Logic
    useEffect(() => {
        let timer;
        if (isSessionActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isSessionActive) {
            triggerAbsenceProcessing();
        }
        return () => clearInterval(timer);
    }, [isSessionActive, timeLeft]);

    const startSession = () => {
        window.location.href = '/camera?session=true';
    };

    const triggerAbsenceProcessing = async () => {
        setIsSessionActive(false);
        setSessionStatus('Processing Alerts...');
        try {
            const now = new Date();
            const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
            const today = localDate.toISOString().split('T')[0];

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/process-absences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: today })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Session Ended. ${data.message}`);
                setSessionStatus('Session Finished: Notifications Sent');
            } else {
                alert(`Error: ${data.message}`);
                setSessionStatus('Error in Processing');
            }
        } catch (error) {
            console.error("Absence Processing Error:", error);
            setSessionStatus('Connection Error');
        } finally {
            fetchDashboardData();
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm(`Are you sure you want to remove user ${userId}? This will also delete their face data.`)) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                alert('User removed successfully');
                fetchDashboardData();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to remove user');
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert('Error deleting user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteAttendance = async (id) => {
        if (!window.confirm('Delete this attendance record?')) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDashboardData();
            }
        } catch (error) {
            alert('Error deleting record');
        } finally {
            setActionLoading(false);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manualData)
            });
            const data = await res.json();
            if (res.ok) {
                alert('Attendance added manually!');
                setShowManualModal(false);
                fetchDashboardData();
            } else {
                alert(data.message || 'Failed to add attendance');
            }
        } catch (error) {
            alert('Error connecting to server');
        } finally {
            setActionLoading(false);
        }
    };


    return (
        <div className="animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
                    <p className="mt-1 text-gray-500 text-sm">Manage users and attendance records</p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-emerald-600 text-sm font-medium rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Manual Entry
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5 md:p-6">
                    <dt className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total Users</dt>
                    <dd className="text-3xl font-black text-gray-900">{stats.totalUsers}</dd>
                </div>
                <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5 md:p-6">
                    <dt className="text-[10px] uppercase font-bold text-rose-400 tracking-widest mb-1">Absent Today</dt>
                    <dd className="text-3xl font-black text-rose-600">{stats.absentToday}</dd>
                </div>
                <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5 md:p-6">
                    <dt className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-1">Present Today</dt>
                    <dd className="text-3xl font-black text-emerald-600">{stats.presentToday}</dd>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 overflow-hidden shadow-xl rounded-2xl p-5 md:p-6 text-white sm:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-black uppercase tracking-wider opacity-90">Live Scanner</div>
                        {isSessionActive && <span className="flex items-center gap-1.5 bg-red-500 rounded-full px-2 py-0.5 text-[8px] uppercase font-black tracking-tighter animate-pulse shadow-lg ring-4 ring-red-500/20">Active</span>}
                    </div>

                    {!isSessionActive && sessionStatus === 'Idle' ? (
                        <div className="space-y-3 mt-2">
                            <button
                                onClick={startSession}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold transition-all active:scale-95"
                            >
                                Start Session & Open Camera
                            </button>
                        </div>
                    ) : (
                        <div className="mt-1 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-black">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                <span className="text-xs opacity-70 font-bold uppercase tracking-widest">{sessionStatus}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-1000"
                                    style={{ width: `${(timeLeft / 20) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={triggerAbsenceProcessing}
                                    className="flex-1 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-bold uppercase"
                                >
                                    End Session Now
                                </button>
                                <button
                                    onClick={() => { setTimeLeft(20); setSessionStatus('Idle'); setIsSessionActive(false); }}
                                    className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attendance Table */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900">Recent Logs</h3>
                        {actionLoading && <span className="text-xs text-indigo-600 animate-pulse">Processing...</span>}
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white sticky top-0 uppercase text-[10px] font-bold text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 text-left">User</th>
                                    <th className="px-6 py-3 text-left">Time</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendance.length === 0 ? (
                                    <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">No records.</td></tr>
                                ) : (
                                    attendance.map((record) => (
                                        <tr key={record._id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-indigo-900 text-sm">{record.userId}</div>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                        record.status.includes('Present') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {record.status}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 capitalize">{record.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{record.time}</div>
                                                <div className="text-[10px] text-gray-400">{record.date}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteAttendance(record._id)}
                                                    className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                                                    title="Delete Record"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900">User Directory</h3>
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white sticky top-0 uppercase text-[10px] font-bold text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 text-left">User Details</th>
                                    <th className="px-6 py-3 text-left">Parent Contact</th>
                                    <th className="px-6 py-3 text-center">Face Data</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.length === 0 ? (
                                    <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">No users.</td></tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm">
                                                <div className="font-bold text-gray-900">{user.name}</div>
                                                <div className="text-xs text-indigo-600 font-medium">{user.userId}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {user.parentPhone && (
                                                        <a href={`tel:${user.parentPhone}`} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 w-fit">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                            Call Parent
                                                        </a>
                                                    )}
                                                    {user.parentEmail && (
                                                        <a href={`mailto:${user.parentEmail}`} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 w-fit">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                            Email Parent
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user.faceDataRegistered ?
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">READY</span> :
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">NO FACE</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteUser(user.userId)}
                                                    className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                                                    title="Remove User"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">Manual Attendance Entry</h3>
                            <button onClick={() => setShowManualModal(false)} className="hover:rotate-90 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleManualSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">User ID (Exact)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. EMP001"
                                    value={manualData.userId}
                                    onChange={(e) => setManualData({ ...manualData, userId: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={manualData.date}
                                        onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={manualData.time}
                                        onChange={(e) => setManualData({ ...manualData, time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : 'Confirm Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
