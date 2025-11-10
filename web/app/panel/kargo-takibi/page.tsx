'use client'

export default function ShippingTrackingPage() {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Kargo Takibi
        </h1>
      </div>

      {/* DHL eCommerce Tracking Embed */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">local_shipping</span>
            DHL eCommerce Gönderi Takibi
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gönderi takip numaranızı girerek kargonuzun durumunu öğrenebilirsiniz.
          </p>
        </div>
        <div className="w-full" style={{ height: '800px' }}>
          <iframe
            src="https://www.dhlecommerce.com.tr/gonderitakip"
            className="w-full h-full border-0"
            title="DHL eCommerce Gönderi Takibi"
            allow="fullscreen"
            loading="lazy"
          />
        </div>
      </div>

    </div>
  )
}

