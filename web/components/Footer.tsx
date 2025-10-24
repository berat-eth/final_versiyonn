import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
    return (
        <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black text-gray-300 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 px-4 md:px-10 lg:px-20 mx-auto py-16">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Huğlu Tekstil Atölyesi</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">Özel iş kıyafetlerinde güvenilir çözüm ortağınız. Kalite, konfor ve şıklığı bir araya getiriyoruz.</p>
                        <div className="flex gap-3">
                            <a className="group p-2 bg-gray-800 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all duration-300 hover:scale-110" href="#">
                                <svg aria-hidden="true" className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"></path>
                                </svg>
                            </a>
                            <a className="group p-2 bg-gray-800 hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-600 rounded-lg transition-all duration-300 hover:scale-110" href="#">
                                <svg aria-hidden="true" className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                                </svg>
                            </a>
                            <a className="group p-2 bg-gray-800 hover:bg-gradient-to-br hover:from-pink-600 hover:to-purple-600 rounded-lg transition-all duration-300 hover:scale-110" href="#">
                                <svg aria-hidden="true" className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.08 2.465c.636-.247 1.363-.416 2.427-.465C9.53 2.013 9.884 2 12.315 2zM12 8.118a4.882 4.882 0 100 9.764 4.882 4.882 0 000-9.764zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" fillRule="evenodd"></path>
                                </svg>
                            </a>
                            <a className="group p-2 bg-gray-800 hover:bg-gradient-to-br hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-300 hover:scale-110" href="#">
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors text-xl">chat</span>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-400">link</span>
                            Hızlı Bağlantılar
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link className="group flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-all" href="/">
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    Ana Sayfa
                                </Link>
                            </li>
                            <li>
                                <Link className="group flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-all" href="/urunler">
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    Ürünler
                                </Link>
                            </li>
                            <li>
                                <Link className="group flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-all" href="/hakkimizda">
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    Hakkımızda
                                </Link>
                            </li>
                            <li>
                                <Link className="group flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-all" href="/iletisim">
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    İletişim
                                </Link>
                            </li>
                            <li>
                                <Link className="group flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-all" href="/teklif-al">
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    Teklif Al
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400">contact_mail</span>
                            İletişim
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-gray-400">
                                <span className="material-symbols-outlined text-blue-400 text-xl mt-0.5">location_on</span>
                                <span>KOMEK, Huğlu, 43173.SK SİTESİ NO:20<br/>42700 Beyşehir/Konya</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                                <span className="material-symbols-outlined text-blue-400 text-xl">phone</span>
                                <a href="tel:+905303125813">0530 312 58 13</a>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                                <span className="material-symbols-outlined text-blue-400 text-xl">email</span>
                                <a href="mailto:bilgi@huglutekstil.com">bilgi@huglutekstil.com</a>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-pink-400">mail</span>
                            Bülten
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">Kampanya ve yeniliklerden haberdar olun</p>
                        <div className="flex gap-2">
                            <input 
                                type="email" 
                                placeholder="E-posta adresiniz" 
                                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            <button className="p-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300">
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                        <div className="mt-6 p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-yellow-400 text-xl">verified</span>
                                <span className="text-sm font-bold text-white">Güvenli Alışveriş</span>
                            </div>
                            <p className="text-xs text-gray-400">SSL sertifikalı güvenli ödeme</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-500">© 2024 Huğlu Tekstil Atölyesi. Tüm hakları saklıdır.</p>
                        <div className="flex gap-6 text-sm text-gray-500">
                            <Link href="/gizlilik" className="hover:text-purple-400 transition-colors">Gizlilik Politikası</Link>
                            <Link href="/kullanim-kosullari" className="hover:text-purple-400 transition-colors">Kullanım Koşulları</Link>
                            <Link href="/cerez-politikasi" className="hover:text-purple-400 transition-colors">Çerez Politikası</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
