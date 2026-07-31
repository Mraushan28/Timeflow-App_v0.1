import React, { useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi';

export default function Toast({ message, type, isVisible, onClose }) {
    useEffect(() => {
        if (isVisible && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const isSuccess = type === 'success';

    return (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[110] animate-fade-in pointer-events-auto">
            <div
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[280px] sm:min-w-[320px] ${isSuccess
                    ? 'bg-green-50 dark:bg-green-900/80 border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-700'
                    }`}
            >
                {isSuccess ? (
                    <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-300 flex-shrink-0" />
                ) : (
                    <FiXCircle className="w-6 h-6 text-red-600 dark:text-red-300 flex-shrink-0" />
                )}
                <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 flex-1">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                >
                    <FiX className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
            </div>
        </div>
    );
}
