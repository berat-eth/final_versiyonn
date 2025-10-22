import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function Urunler() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16">
        <div className="max-w-[1400px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">inventory_2</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Ürün Kataloğu</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Ürün Kataloğumuz
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              İşinize özel, kaliteli iş kıyafetleri ve ekipmanlarımızı detaylı inceleyin
            </p>
          </div>

          {/* PDF Catalog Section */}
          <div className="space-y-6">
            {/* PDF Viewer */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                    <span className="material-symbols-outlined text-white text-2xl">picture_as_pdf</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Huğlu Outdoor E-Katalog</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tüm ürünlerimizi detaylı inceleyin</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://static.ticimax.cloud/52071/uploads/dosyalar/huglu-outdoor-e-Katalog.pdf"
                    download
                    className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
                  >
                    <span className="material-symbols-outlined">download</span>
                    <span>Kataloğu İndir</span>
                  </a>
                  <a
                    href="https://static.ticimax.cloud/52071/uploads/dosyalar/huglu-outdoor-e-Katalog.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                    <span>Yeni Sekmede Aç</span>
                  </a>
                </div>
              </div>
              <div className="relative w-full" style={{ height: 'calc(100vh - 100px)' }}>
                <iframe
                  src="https://static.ticimax.cloud/52071/uploads/dosyalar/huglu-outdoor-e-Katalog.pdf"
                  className="w-full h-full"
                  title="Huğlu Outdoor E-Katalog"
                />
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">verified</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Kaliteli Ürünler</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tüm ürünlerimiz kalite standartlarına uygun üretilmektedir</p>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">palette</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Özel Tasarım</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Markanıza özel renk ve logo baskısı yapılabilir</p>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">local_shipping</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Hızlı Teslimat</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Siparişleriniz en kısa sürede teslim edilir</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
