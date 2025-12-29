import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getUserCount } from '../services/api';

export default function Home() {
    const [canRegister, setCanRegister] = useState(false);

    useEffect(() => {
        const checkUserCount = async () => {
            try {
                const { count } = await getUserCount();
                setCanRegister(count === 0);
            } catch (err) {
                console.error('Failed to check user count:', err);
            }
        };
        checkUserCount();
    }, []);
    return (
        <div className="min-h-screen flex flex-col">
            {/* Hero Section */}
            <div className="relative bg-blue-900 text-white overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-800 opacity-90"></div>
                    {/* Abstract background pattern could go here */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex flex-col items-center text-center">
                    <div className="mb-8 p-4 bg-white/10 rounded-full backdrop-blur-sm animate-fade-in-up">
                        <span className="text-4xl md:text-6xl">📂</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 animate-fade-in-up animation-delay-100">
                        CDRRMO
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mb-10 animate-fade-in-up animation-delay-200">
                        City Disaster Risk Reduction and Management Office <br />
                        <span className="font-semibold text-white">File Management System</span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up animation-delay-300">
                        <Link
                            to="/login"
                            className="px-8 py-4 bg-white text-blue-900 rounded-lg font-bold text-lg shadow-lg hover:bg-blue-50 transition-all transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-900 focus:ring-white"
                        >
                            Sign In
                        </Link>
                        {canRegister && (
                            <Link
                                to="/register"
                                className="px-8 py-4 bg-blue-700 text-white rounded-lg font-bold text-lg shadow-lg hover:bg-blue-600 transition-all transform hover:-translate-y-1 hover:shadow-xl border border-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-900 focus:ring-blue-500"
                            >
                                Create Account
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-16 bg-slate-50 flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900">Secure & Efficient Management</h2>
                        <p className="mt-4 text-lg text-slate-600">Designed for rapid access and secure storage of critical disaster management files.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border-t-4 border-blue-600">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-2xl mb-6">
                                🔒
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Storage</h3>
                            <p className="text-slate-600">
                                Enterprise-grade security for sensitive documents. Role-based access control ensures only authorized personnel can view files.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border-t-4 border-amber-500">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-2xl mb-6">
                                📝
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Activity Logging</h3>
                            <p className="text-slate-600">
                                Comprehensive audit trails for every action. Track uploads, downloads, and modifications in real-time.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border-t-4 border-emerald-500">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-2xl mb-6">
                                🚀
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Rapid Access</h3>
                            <p className="text-slate-600">
                                Optimized for speed. Quickly search, filter, and retrieve operation manuals and research data when it matters most.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <span className="font-bold text-white text-lg">CDRRMO</span>
                    </div>
                    <div className="text-sm">
                        &copy; {new Date().getFullYear()} City Disaster Risk Reduction and Management Office. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
