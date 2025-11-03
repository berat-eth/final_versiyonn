'use client';

import { useState, useRef } from 'react';
import GoogleMapsSearchForm from '@/components/GoogleMapsSearchForm';
import GoogleMapsResultsTable from '@/components/GoogleMapsResultsTable';
import GoogleMapsExportButton from '@/components/GoogleMapsExportButton';
import GoogleMapsProgressBar from '@/components/GoogleMapsProgressBar';
import { BusinessData, ScrapeResponse } from '@/lib/googleMapsTypes';
import { api, ApiResponse } from '@/lib/api';

export default function GoogleMapsScraper() {
  const [scrapedData, setScrapedData] = useState<BusinessData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '', totalFound: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = async (searchTerm: string, maxResults: number = 50) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress({ current: 0, total: maxResults, status: 'Arama başlatılıyor...', totalFound: 0 });
      
      // Clear previous data for new search
      setScrapedData([]);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Fetch streaming response
      const response = await fetch('/api/google-maps-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm, maxResults }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      const allResults: BusinessData[] = [];
      let isAborted = false;

      // Check for abort before reading
      abortControllerRef.current?.signal.addEventListener('abort', () => {
        isAborted = true;
        reader.cancel();
      });

      try {
        while (true) {
          // Check if aborted
          if (abortControllerRef.current?.signal.aborted || isAborted) {
            console.log('Scraping stopped by user');
            setProgress({ current: 0, total: 0, status: 'İşlem durduruldu', totalFound: 0 });
            break;
          }

          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            // Check if aborted during processing
            if (abortControllerRef.current?.signal.aborted || isAborted) {
              reader.cancel();
              break;
            }

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  setProgress({
                    current: data.current || 0,
                    total: data.total || maxResults,
                    status: data.message || 'İşletme bilgileri toplanıyor...',
                    totalFound: data.totalFound || 0
                  });
                } else if (data.type === 'result') {
                  // Live result - add immediately to table
                  const business = data.data as BusinessData;
                  setScrapedData((prevData) => [...prevData, business]);
                  allResults.push(business);
                  
                  setProgress({
                    current: data.current || 0,
                    total: data.total || maxResults,
                    status: `İşletme bilgileri çıkarılıyor... (${data.current}/${data.total})`,
                    totalFound: data.totalFound || 0
                  });
                } else if (data.type === 'complete') {
                  setProgress({
                    current: data.count || 0,
                    total: data.count || 0,
                    status: 'Tamamlandı! Veriler kaydediliyor...',
                    totalFound: data.totalFound || 0
                  });
                  
                  // Save all results to database
                  try {
                    const saveResponse = await api.post<ApiResponse<{ saved: number }>>('/admin/google-maps/scraped-data', {
                      data: allResults,
                      searchTerm: searchTerm
                    });
                    
                    if (saveResponse.success) {
                      setProgress({
                        current: data.count || 0,
                        total: data.count || 0,
                        status: `Tamamlandı! ${saveResponse.data?.saved || 0} kayıt veritabanına kaydedildi.`,
                        totalFound: data.totalFound || 0
                      });
                    }
                  } catch (saveError) {
                    console.error('Veritabanına kaydetme hatası:', saveError);
                  }
                  
                  // Clear progress after 3 seconds
                  setTimeout(() => {
                    setProgress({ current: 0, total: 0, status: '', totalFound: 0 });
                  }, 3000);
                  
                  setIsLoading(false);
                } else if (data.type === 'error') {
                  setError(data.error || 'Bir hata oluştu');
                  setIsLoading(false);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } catch (readError) {
        if (readError instanceof Error && readError.name === 'AbortError' || isAborted) {
          console.log('Reader cancelled');
        } else {
          throw readError;
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was aborted, don't show error
          console.log('Scraping stopped by user');
          setProgress({ current: 0, total: 0, status: '', totalFound: 0 });
        } else {
          setError(err.message || 'Bir hata oluştu');
        }
      } else {
        setError('Bilinmeyen bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setProgress({ current: 0, total: 0, status: 'İşlem durduruldu', totalFound: 0 });
    }
  };

  const handleClear = () => {
    setScrapedData([]);
    setError(null);
  };

  // Calculate stats for summary cards
  const totalBusinesses = scrapedData.length;
  const hasWebsite = scrapedData.filter(b => b.website).length;
  const hasPhone = scrapedData.filter(b => b.phoneNumber).length;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-slate-900 dark:text-white mb-2">
              AI Müşteri Bulucu
            </h1>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              İşletme bilgilerini topla ve indir
            </p>
          </div>
          
          {/* Export Button in Header */}
          {scrapedData.length > 0 && !isLoading && (
            <GoogleMapsExportButton
              data={scrapedData}
              disabled={scrapedData.length === 0}
            />
          )}
        </div>

        {/* Summary Cards */}
        {scrapedData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Toplam İşletme */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 dark:text-gray-400">Toplam İşletme</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">{totalBusinesses}</div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Web Sitesi Olan */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 dark:text-gray-400">Web Sitesi Olan</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">{hasWebsite}</div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: totalBusinesses > 0 ? `${(hasWebsite / totalBusinesses) * 100}%` : '0%' }}></div>
              </div>
            </div>

            {/* Telefon Olan */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 dark:text-gray-400">Telefon Olan</span>
              </div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">{hasPhone}</div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: totalBusinesses > 0 ? `${(hasPhone / totalBusinesses) * 100}%` : '0%' }}></div>
              </div>
            </div>

            {/* Toplam Bulunan */}
            {progress.totalFound > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-gray-400">Toplam Bulunan</span>
                </div>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">{progress.totalFound}</div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: progress.totalFound > 0 ? `${(totalBusinesses / progress.totalFound) * 100}%` : '0%' }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Search Form */}
          <GoogleMapsSearchForm
            onSearch={handleSearch}
            isLoading={isLoading}
            onStop={handleStop}
          />

          {/* Progress Bar */}
          {isLoading && progress.total > 0 && (
            <GoogleMapsProgressBar
              current={progress.current}
              total={progress.total}
              status={progress.status}
              totalFound={progress.totalFound}
            />
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Results Table */}
          <GoogleMapsResultsTable
            data={scrapedData}
            onClear={handleClear}
          />
        </div>
      </div>
    </div>
  );
}

