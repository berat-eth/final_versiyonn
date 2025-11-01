'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 mx-auto max-w-[1920px]">
        {/* Main Footer Content */}
        <div className="pt-20 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-12 xl:gap-16">
            {/* Company Info & Logo */}
            <div className="lg:col-span-1 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12">
                  <Image
                    src="/assets/logo.png"
                    alt="Huğlu Tekstil Logo"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <h3 className="text-xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Huğlu Tekstil
                </h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Özel iş kıyafetlerinde güvenilir çözüm ortağınız. Kalite, konfor ve şıklığı bir araya getiriyoruz.
              </p>
              <div className="pt-2 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  Huğlu Tekstil, bir{' '}
                  <a
                    href="https://huglu.com.tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 underline transition-colors"
                  >
                    Huğlu Av tüfekleri Kooperatifi
                  </a>{' '}
                  markasıdır.
                </p>
              </div>
              
              {/* Social Media */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://www.facebook.com/hugluoutdoor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-2.5 bg-gray-800/50 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/30"
                  aria-label="Facebook"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      clipRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      fillRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/hugluoutdoor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-2.5 bg-gray-800/50 hover:bg-gradient-to-br hover:from-pink-600 hover:to-purple-600 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/30"
                  aria-label="Instagram"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      clipRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.08 2.465c.636-.247 1.363-.416 2.427-.465C9.53 2.013 9.884 2 12.315 2zM12 8.118a4.882 4.882 0 100 9.764 4.882 4.882 0 000-9.764zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"
                      fillRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://wa.me/905303125813"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-2.5 bg-gray-800/50 hover:bg-gradient-to-br hover:from-green-500 hover:to-green-600 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-green-500/30"
                  aria-label="WhatsApp"
                >
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors text-xl">
                    chat
                  </span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">explore</span>
                Hızlı Bağlantılar
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="group flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      arrow_forward
                    </span>
                    <span>Ana Sayfa</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/urunler"
                    className="group flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      arrow_forward
                    </span>
                    <span>Ürünler</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/hakkimizda"
                    className="group flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      arrow_forward
                    </span>
                    <span>Hakkımızda</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/teklif-al"
                    className="group flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      arrow_forward
                    </span>
                    <span>Teklif Al</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/iletisim"
                    className="group flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      arrow_forward
                    </span>
                    <span>İletişim</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">contact_mail</span>
                İletişim Bilgileri
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-xl mt-0.5 flex-shrink-0">
                    location_on
                  </span>
                  <span className="text-sm text-gray-400 leading-relaxed">
                    KOMEK, Huğlu, 43173.SK SİTESİ NO:20<br />
                    42700 Beyşehir/Konya
                  </span>
                </li>
                <li>
                  <a
                    href="tel:+905303125813"
                    className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-blue-400 text-xl">phone</span>
                    <span className="group-hover:underline">0530 312 58 13</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@hugluoutdoor.com"
                    className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-blue-400 text-xl">email</span>
                    <span className="group-hover:underline break-all">info@hugluoutdoor.com</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/905303125813"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-gray-400 hover:text-green-400 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-green-400 text-xl">chat</span>
                    <span className="group-hover:underline">WhatsApp Destek</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Newsletter */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-pink-400">gavel</span>
                Yasal
              </h3>
              <ul className="space-y-3 mb-6">
                <li>
                  <Link
                    href="/gizlilik"
                    className="text-sm text-gray-400 hover:text-pink-400 transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>Gizlilik Politikası</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kullanim-kosullari"
                    className="text-sm text-gray-400 hover:text-pink-400 transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-xs">description</span>
                    <span>Kullanım Koşulları</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cerez-politikasi"
                    className="text-sm text-gray-400 hover:text-pink-400 transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-xs">cookie</span>
                    <span>Çerez Politikası</span>
                  </Link>
                </li>
              </ul>

              {/* Trust Badge */}
              <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-yellow-400 text-xl">verified</span>
                  <span className="text-sm font-bold text-white">Güvenli Alışveriş</span>
                </div>
                <p className="text-xs text-gray-400">SSL sertifikalı güvenli ödeme sistemi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Statement */}
        <div className="border-t border-gray-800/50 pt-8 pb-6">
          <div className="flex flex-col items-center text-center gap-4">
            <Link href="/" className="inline-block">
              <Image
                src="/assets/logo.png"
                alt="Huğlu Tekstil Logo"
                width={180}
                height={72}
                className="h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                unoptimized
              />
            </Link>
            <p className="text-sm text-gray-500 font-medium">
              Huğlu Tekstil, bir{' '}
              <a
                href="https://huglu.com.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 font-semibold hover:text-blue-400 underline transition-colors"
              >
                Huğlu Av tüfekleri Kooperatifi
              </a>{' '}
              markasıdır.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/50 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-gray-500">
              <p>© {currentYear} Huğlu Tekstil Atölyesi.</p>
              <p className="hidden md:block">Tüm hakları saklıdır.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">code</span>
                Made with ❤️ in Konya
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
