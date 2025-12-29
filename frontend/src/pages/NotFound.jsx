import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white p-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-500">404</h1>
                <h2 className="text-4xl font-bold mt-4 mb-6">Page Not Found</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    Oops! The page you are looking for does not exist. It might have been moved or deleted.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                    Go Back Home
                </Link>
            </div>
        </div>
    );
}
