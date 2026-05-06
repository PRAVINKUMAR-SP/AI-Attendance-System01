import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="bg-gray-900 shadow-xl border-b border-gray-800 sticky top-0 z-[100]">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center py-4 md:h-16 gap-4">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <span className="font-bold text-lg md:text-xl text-white tracking-tight">AI Attendence</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 md:space-x-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto justify-center scrollbar-hide">
                        <Link to="/" className="text-gray-300 whitespace-nowrap hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors">
                            Dashboard
                        </Link>
                        <Link to="/register" className="text-gray-300 whitespace-nowrap hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors">
                            Enroll
                        </Link>
                        <Link to="/sheet" className="text-gray-300 whitespace-nowrap hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors">
                            Report
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
