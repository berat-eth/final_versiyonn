'use client';

import { useState, FormEvent } from 'react';

interface GoogleMapsSearchFormProps {
  onSearch: (searchTerm: string, maxResults: number) => Promise<void>;
  isLoading: boolean;
  onStop: () => void;
}

export default function GoogleMapsSearchForm({ onSearch, isLoading, onStop }: GoogleMapsSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [maxResults, setMaxResults] = useState(10000);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate non-empty search term
    if (!searchTerm.trim()) {
      setError('Lütfen bir arama terimi girin');
      return;
    }

    // Validate maxResults
    if (maxResults < 1 || maxResults > 10000) {
      setError('Sonuç sayısı 1 ile 10000 arasında olmalıdır');
      return;
    }

    setError('');
    await onSearch(searchTerm.trim(), maxResults);
  };

  const handleStop = () => {
    onStop();
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="searchTerm"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Arama terimi giriniz... Ör(Kafe, Restoran, Market, vb.)"
                disabled={isLoading}
                className={`w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  error ? 'border-red-500' : ''
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            {error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Max Results Input */}
          <div className="w-full md:w-48">
            <input
              id="maxResults"
              type="number"
              min="1"
              max="10000"
              value={maxResults}
              onChange={(e) => {
                setMaxResults(parseInt(e.target.value) || 10000);
                if (error) setError('');
              }}
              disabled={isLoading}
              placeholder="Sonuç sayısı"
              className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Action Button */}
          <div className="w-full md:w-auto">
            {!isLoading ? (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ara
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="w-full md:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 transition-colors"
              >
                Durdur
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-slate-400 dark:border-gray-400 border-t-transparent rounded-full"></div>
            <span>Veriler toplanıyor...</span>
          </div>
        )}
      </form>
    </div>
  );
}

