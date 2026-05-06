import { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceSheet = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [sheetData, setSheetData] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSheetData();
    }, [month]);

    const fetchSheetData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/attendance/sheet?month=${month}`);
            setSheetData(response.data.data);
            setDaysInMonth(response.data.daysInMonth);
        } catch (error) {
            console.error('Error fetching sheet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusAbbreviation = (status) => {
        if (!status) return '-';
        if (status.includes('Present')) return 'P';
        if (status.includes('Absent')) return 'A';
        return status[0];
    };

    const getStatusColor = (status) => {
        if (!status) return 'text-gray-300';
        if (status.includes('Present')) return 'text-green-600 font-bold';
        if (status.includes('Absent')) return 'text-red-600 font-bold';
        return 'text-blue-600';
    };

    const exportSheetCSV = () => {
        if (sheetData.length === 0) return;

        // Create Headers: Student Name, 01, 02, ..., 31, Total, Percentage
        const dayHeaders = [...Array(daysInMonth)].map((_, i) => (i + 1).toString().padStart(2, '0'));
        const headers = ["Student Name", ...dayHeaders, "Total Present", "Percentage (%)"].join(",");

        // Create Rows
        const rows = sheetData.map(row => {
            const attendanceValues = dayHeaders.map(day => {
                const status = row.attendance[day];
                if (!status) return "-";
                if (status.includes('Present')) return "P";
                if (status.includes('Absent')) return "A";
                return status;
            });
            return `"${row.name}",${attendanceValues.join(",")},${row.presentCount},${row.percentage}%`;
        });

        const csvString = headers + "\n" + rows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Attendance_Report_${month}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Attendance Tracking Sheet</h2>
                    <p className="text-gray-500 text-xs">Monthly overview of all students</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportSheetCSV}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-all"
                    >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Grid CSV
                    </button>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <label className="text-xs font-semibold text-gray-700">Select Month:</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="border-none focus:ring-0 text-xs font-medium text-blue-600 cursor-pointer p-0"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-auto flex-grow scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style dangerouslySetInnerHTML={{__html: `
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}} />
                <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-gray-900 text-white text-[10px] uppercase tracking-wider">
                            <th className="p-3 sticky left-0 z-30 bg-gray-900 border-r border-gray-800 w-[150px] shrink-0">Student Name</th>
                            {[...Array(daysInMonth)].map((_, i) => (
                                <th key={i} className="p-1 text-center border-r border-gray-800 w-[30px] shrink-0">
                                    {(i + 1).toString().padStart(2, '0')}
                                </th>
                            ))}
                            <th className="p-3 text-center bg-blue-900 w-[60px] shrink-0">Total</th>
                            <th className="p-3 text-center bg-blue-900 w-[60px] shrink-0">%</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {loading ? (
                            <tr>
                                <td colSpan={daysInMonth + 3} className="p-20 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="animate-pulse">Loading attendance records...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : sheetData.length === 0 ? (
                            <tr>
                                <td colSpan={daysInMonth + 3} className="p-20 text-center text-gray-500">
                                    No students found in the database.
                                </td>
                            </tr>
                        ) : (
                            sheetData.map((row, idx) => (
                                <tr key={row.userId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50 hover:bg-blue-50/30 transition-colors'}>
                                    <td className="p-3 font-medium text-gray-900 sticky left-0 z-10 bg-inherit border-r border-gray-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)] truncate">
                                        {row.name}
                                    </td>
                                    {[...Array(daysInMonth)].map((_, i) => {
                                        const dayStr = (i + 1).toString().padStart(2, '0');
                                        const status = row.attendance[dayStr];
                                        return (
                                            <td key={i} className={`p-1 text-center border-r border-gray-50 ${getStatusColor(status)}`}>
                                                {getStatusAbbreviation(status)}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/20">
                                        {row.presentCount}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            parseFloat(row.percentage) >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {row.percentage}%
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-4 text-[10px] text-gray-600 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-600 rounded-sm"></span>
                    <span>P = Present</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-600 rounded-sm"></span>
                    <span>A = Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-gray-300 rounded-sm"></span>
                    <span>- = No Record</span>
                </div>
            </div>
        </div>
    );
};

export default AttendanceSheet;
