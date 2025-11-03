'use client';

import { useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { Search, Globe, CheckCircle2, AlertCircle, XCircle, Loader2, ExternalLink, BarChart3 } from 'lucide-react';

interface SEOAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  h1Count: number;
  h1Tags: string[];
  h2Count: number;
  h2Tags: string[];
  imagesCount: number;
  imagesWithoutAlt: number;
  linksCount: number;
  internalLinks: number;
  externalLinks: number;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  schemaMarkup: boolean;
  mobileFriendly: boolean;
  loadTime?: number;
  statusCode: number;
  wordCount: number;
  issues: string[];
  score: number;
}

export default function SEO() {
  const [url, setUrl] = useState('https://hugluoutdoor.com');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Lütfen bir URL girin');
      return;
    }

    // URL formatını düzelt
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await api.post<ApiResponse<SEOAnalysis>>('/admin/seo/analyze', { url: finalUrl });
      
      if (response.success && response.data) {
        setAnalysis(response.data);
      } else {
        setError('SEO analizi yapılamadı. Lütfen geçerli bir URL girin.');
      }
    } catch (err: any) {
      console.error('SEO analizi hatası:', err);
      setError(err.message || 'SEO analizi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                SEO Analiz Paneli
              </h1>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Web sitenizin SEO durumunu analiz edin
              </p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-slate-400 dark:text-gray-400" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://hugluoutdoor.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Analiz Et</span>
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className={`rounded-xl border-2 p-6 ${getScoreBgColor(analysis.score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    SEO Skoru
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-gray-400">
                    Genel performans değerlendirmesi
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-gray-400 mt-1">/ 100</div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title & Meta */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Temel Bilgiler
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                      Sayfa Başlığı
                    </label>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white font-medium">
                      {analysis.title || 'Bulunamadı'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      {analysis.title ? `${analysis.title.length} karakter` : '0 karakter'}
                    </p>
                    {analysis.title && (
                      <div className="mt-2 flex items-center gap-1">
                        {analysis.title.length >= 30 && analysis.title.length <= 60 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs text-slate-600 dark:text-gray-400">
                          {analysis.title.length >= 30 && analysis.title.length <= 60
                            ? 'İdeal uzunluk'
                            : 'İdeal uzunluk 30-60 karakter arası'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                      Meta Açıklama
                    </label>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white">
                      {analysis.metaDescription || 'Bulunamadı'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      {analysis.metaDescription ? `${analysis.metaDescription.length} karakter` : '0 karakter'}
                    </p>
                    {analysis.metaDescription && (
                      <div className="mt-2 flex items-center gap-1">
                        {analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs text-slate-600 dark:text-gray-400">
                          {analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160
                            ? 'İdeal uzunluk'
                            : 'İdeal uzunluk 120-160 karakter arası'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                      Meta Keywords
                    </label>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white">
                      {analysis.metaKeywords || 'Bulunamadı'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical SEO */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-purple-500" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Teknik SEO
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-gray-400">HTTP Durum Kodu</span>
                    <span className={`text-sm font-medium ${
                      analysis.statusCode === 200 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {analysis.statusCode}
                    </span>
                  </div>

                  {analysis.loadTime && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-600 dark:text-gray-400">Yükleme Süresi</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {analysis.loadTime}ms
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Canonical URL</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white break-all text-right max-w-xs">
                      {analysis.canonicalUrl || 'Bulunamadı'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Robots</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {analysis.robots || 'Bulunamadı'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Mobil Uyumlu</span>
                    {analysis.mobileFriendly ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  İçerik Analizi
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Kelime Sayısı</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.wordCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">H1 Etiketleri</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.h1Count}</span>
                  </div>
                  {analysis.h1Tags.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-blue-500">
                      {analysis.h1Tags.slice(0, 3).map((tag, idx) => (
                        <p key={idx} className="text-xs text-slate-600 dark:text-gray-400 py-1">
                          • {tag}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">H2 Etiketleri</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.h2Count}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Medya ve Bağlantılar
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Toplam Görsel</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.imagesCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Alt Text Olmayan Görsel</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        analysis.imagesWithoutAlt === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {analysis.imagesWithoutAlt}
                      </span>
                      {analysis.imagesWithoutAlt === 0 && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Toplam Bağlantı</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.linksCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">İç Bağlantı</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.internalLinks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Dış Bağlantı</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{analysis.externalLinks}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Graph */}
            {(analysis.ogTitle || analysis.ogDescription || analysis.ogImage) && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Open Graph (Sosyal Medya)
                </h3>
                <div className="space-y-3">
                  {analysis.ogTitle && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400">OG Title</span>
                      <p className="mt-1 text-sm text-slate-900 dark:text-white">{analysis.ogTitle}</p>
                    </div>
                  )}
                  {analysis.ogDescription && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400">OG Description</span>
                      <p className="mt-1 text-sm text-slate-900 dark:text-white">{analysis.ogDescription}</p>
                    </div>
                  )}
                  {analysis.ogImage && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400">OG Image</span>
                      <div className="mt-2">
                        <img
                          src={analysis.ogImage}
                          alt="OG Image"
                          className="max-w-md h-auto rounded-lg border border-slate-200 dark:border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                    Tespit Edilen Sorunlar
                  </h3>
                </div>
                <ul className="space-y-2">
                  {analysis.issues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                      <span className="mt-0.5">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
