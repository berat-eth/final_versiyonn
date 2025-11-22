'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

const Header = dynamic(() => import('@/components/Header'), { ssr: false })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false })

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=75&auto=format&fit=crop',
    title: 'Outdoor Giyim Toptan',
    highlight: 'Özel Üretim',
    description: 'Toptan outdoor giyim, özel üretim outdoor mont, softshell mont, polar mont üretimi. Teknik giyim toptan satış.'
  },
  {
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=75&auto=format&fit=crop',
    title: 'Kurumsal Outdoor Mont',
    highlight: 'Logo Baskılı Üretim',
    description: 'Kurumsal outdoor kıyafet üretimi, logo baskılı outdoor ürün, markaya özel outdoor mont üretimi'
  },
  {
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&q=75&auto=format&fit=crop',
    title: 'Teknik Giyim Üreticisi',
    highlight: 'Yüksek Kalite',
    description: 'Teknik outdoor giyim, su geçirmez mont, termal içlik, polar ceket toptan üretim. Dayanıklı outdoor kıyafet imalatı'
  },
  {
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=75&auto=format&fit=crop',
    title: 'Kamp Giyim Toptan',
    highlight: 'Az Adet Özel Üretim',
    description: 'Kamp kıyafetleri toptan, trekking montu, avcı montu, taktik mont toptan. Az adet özel üretim outdoor giyim'
  }
] as const

const REFERENCES = [
  { 
    name: 'Türkiye Futbol Federasyonu', 
    color: 'from-blue-500 to-blue-600',
    logo: '/assets/references/tff-logo.png'
  },
  { 
    name: 'Nükte Treyler', 
    color: 'from-purple-500 to-purple-600',
    logo: '/assets/references/nukte-logo.png'
  },
  { 
    name: 'Konya Büyükşehir Belediyesi', 
    color: 'from-pink-500 to-pink-600',
    logo: '/assets/references/konya-logo.png'
  }
] as const

interface SliderItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  highlight?: string;
  isActive: boolean;
  order: number;
  autoPlay: boolean;
  duration: number;
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none';
    value?: string;
  };
  buttonText?: string;
  buttonColor?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export default function Home() {
  const pathname = usePathname()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [slides, setSlides] = useState<SliderItem[]>([])
  const [loadingSliders, setLoadingSliders] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (pathname === '/') {
      setShowPopup(true)
    } else {
      setShowPopup(false)
    }
  }, [pathname])

  useEffect(() => {
    const hardcodedSlides = SLIDES.map((slide, index) => ({
      id: index + 1,
      title: slide.title,
      description: slide.description,
      imageUrl: slide.image,
      highlight: slide.highlight,
      isActive: true,
      order: index + 1,
      autoPlay: true,
      duration: 5,
    }))
    setSlides(hardcodedSlides as SliderItem[])
    setLoadingSliders(false)
  }, [])

  const handleRetailClick = useCallback(() => {
    window.location.href = 'https://hugluoutdoor.com'
  }, [])

  const handleCustomClick = useCallback(() => {
    setShowPopup(false)
  }, [])

  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const handleScrollDown = useCallback(() => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    })
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="relative w-full flex flex-col group/design-root overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <h1 className="sr-only">Outdoor Giyim Toptan | Özel Üretim Outdoor Mont & Teknik Giyim Üreticisi - Huğlu Tekstil</h1>
      
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-scaleIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex flex-col gap-6 text-center">
              <div className="flex justify-center mb-2">
                <Image
                  src="/assets/logo.png"
                  alt="Huğlu Tekstil Logo - Outdoor Giyim Toptan"
                  width={140}
                  height={56}
                  className="h-14 w-auto object-contain"
                  quality={90}
                  priority
                />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Hoş Geldiniz!</h2>
              <p className="text-gray-600 dark:text-gray-300 text-base">
                Huğlu Tekstil olarak outdoor giyim toptan satış, özel üretim outdoor mont, teknik giyim üretimi hizmeti sunuyoruz.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetailClick}
                  className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-base hover:from-blue-700 hover:to-purple-700 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <span className="material-symbols-outlined text-xl">storefront</span>
                  Perakende Mağazamız
                </button>
                <button
                  onClick={handleCustomClick}
                  className="group flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-xl">engineering</span>
                  Özel Üretim & Toptan
                </button>
              </div>
            </div>
            <button
              onClick={handleCustomClick}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>
      )}

      <Header />

      <main className="flex-grow relative">
        {!loadingSliders && slides.length > 0 && (
          <section className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" style={{ height: '100vh', minHeight: '100vh' }}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.3),transparent_50%)] animate-pulse"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.3),transparent_50%)]"></div>
            </div>

            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentSlide 
                    ? 'opacity-100 z-10' 
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={slide.imageUrl}
                    alt={`${slide.title} - ${slide.highlight} - Outdoor Giyim Toptan`}
                    fill
                    className={`object-cover transition-all duration-[10000ms] ease-out ${
                      index === currentSlide ? 'scale-100 brightness-90' : 'scale-110 brightness-50'
                    }`}
                    priority={index === 0}
                    quality={90}
                    sizes="100vw"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-purple-900/30"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-4 md:px-10 lg:px-20 w-full max-w-7xl">
                      <div className={`transform transition-all duration-1000 delay-200 ${
                        index === currentSlide 
                          ? 'translate-y-0 opacity-100 scale-100' 
                          : 'translate-y-12 opacity-0 scale-95'
                      }`}>
                        <div className="relative backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8 md:p-12 shadow-2xl">
                          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl opacity-20 blur-xl -z-10"></div>
                          
                          <div className="relative space-y-6">
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                              <span className="text-sm font-bold text-white tracking-wide">OUTDOOR GIYIM TOPTAN</span>
                            </div>
                            
                            <div className="space-y-3">
                              <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.1] tracking-tight">
                                <span className="text-white drop-shadow-2xl">
                                  {slide.title}
                                </span>
                                <br />
                                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x">
                                  {slide.highlight}
                                </span>
                              </h2>
                            </div>
                            
                            {slide.description && (
                              <p className="text-lg md:text-xl lg:text-2xl text-gray-100 max-w-3xl leading-relaxed font-medium drop-shadow-lg">
                                {slide.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-4 pt-6">
                              <Link 
                                href="/urunler"
                                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-base overflow-hidden shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
                              >
                                <span className="relative z-10">Ürünleri İncele</span>
                                <span className="material-symbols-outlined text-xl relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </Link>
                              <Link 
                                href="/teklif-al"
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-base border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300 hover:scale-105 shadow-xl"
                              >
                                <span>Teklif Al</span>
                                <span className="material-symbols-outlined text-xl">request_quote</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`relative rounded-full transition-all duration-500 ${
                    index === currentSlide
                      ? 'bg-white w-12 h-3 shadow-lg shadow-white/50'
                      : 'bg-white/30 hover:bg-white/50 w-3 h-3 backdrop-blur-sm'
                  }`}
                  aria-label={`Slide ${index + 1}'e geç`}
                >
                  {index === currentSlide && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 group p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110 shadow-xl"
              aria-label="Önceki slide"
            >
              <span className="material-symbols-outlined text-3xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 group p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110 shadow-xl"
              aria-label="Sonraki slide"
            >
              <span className="material-symbols-outlined text-3xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 z-20">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-5000 ease-linear"
                style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
              ></div>
            </div>
            
            <button
              onClick={handleScrollDown}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center gap-2 group cursor-pointer hover:scale-110 transition-transform duration-300"
              aria-label="Aşağı kaydır"
            >
              <span className="text-white/80 text-sm font-semibold mb-2 group-hover:text-white transition-colors">Aşağı Kaydır</span>
              <div className="w-10 h-16 rounded-full border-2 border-white/40 backdrop-blur-sm flex items-start justify-center p-2 group-hover:border-white/60 transition-colors">
                <span className="material-symbols-outlined text-white text-2xl animate-bounce">keyboard_arrow_down</span>
              </div>
            </button>
          </section>
        )}

        <div className="relative px-4 md:px-10 lg:px-20 py-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="layout-content-container flex flex-col max-w-[1200px] mx-auto flex-1">
            <div id="why-us-section" className="flex flex-col gap-10 px-4 py-16 @container">
              <div className="flex flex-col gap-6 items-center text-center">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-2 mx-auto">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">star</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Avantajlarımız</span>
                  </div>
                  <h2 className="text-[#0d141b] dark:text-slate-50 tracking-tight text-4xl md:text-5xl font-black leading-tight max-w-[720px]">
                    Outdoor Giyim <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Toptan Üretim</span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg font-normal leading-relaxed max-w-[720px]">
                    Toptan outdoor giyim, özel üretim outdoor mont, softshell mont, polar mont üretimi. Teknik giyim, kamp kıyafetleri, kurumsal outdoor mont üretimi. Logo baskılı outdoor ürün, az adet özel üretim. Türkiye'nin güvenilir outdoor giyim tedarikçisi.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 p-0">
                <div className="group flex flex-1 gap-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 transition-all duration-300">
                    <span className="material-symbols-outlined text-white text-5xl">verified</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[#0d141b] dark:text-slate-50 text-xl font-bold leading-tight">Yüksek Kalite Outdoor Giyim</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm font-normal leading-relaxed">Toptan outdoor giyim üretiminde teknik kumaşlar, su geçirmez mont, polar mont, softshell mont üretimi. Dayanıklı outdoor kıyafet imalatı.</p>
                  </div>
                </div>
                <div className="group flex flex-1 gap-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600">
                  <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 group-hover:scale-110 transition-all duration-300">
                    <span className="material-symbols-outlined text-white text-5xl">design_services</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[#0d141b] dark:text-slate-50 text-xl font-bold leading-tight">Özel Üretim Outdoor Mont</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm font-normal leading-relaxed">Az adet özel üretim outdoor giyim, logo baskılı outdoor ürün, markaya özel outdoor mont üretimi. Kurumsal outdoor kıyafet üretimi.</p>
                  </div>
                </div>
                <div className="group flex flex-1 gap-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:border-pink-300 dark:hover:border-pink-600">
                  <div className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/50 group-hover:scale-110 transition-all duration-300">
                    <span className="material-symbols-outlined text-white text-5xl">local_shipping</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[#0d141b] dark:text-slate-50 text-xl font-bold leading-tight">Toptan Outdoor Giyim Tedarikçisi</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm font-normal leading-relaxed">Butikler, spor mağazaları, işletmeler için outdoor giyim toptan satış. Kamp giyim, teknik giyim, termal içlik toptan üretim.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-10 px-4 py-16 @container">
              <div className="flex flex-col gap-6 items-center text-center">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-2 mx-auto">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">business</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Referanslarımız</span>
                  </div>
                  <h2 className="text-[#0d141b] dark:text-slate-50 tracking-tight text-4xl md:text-5xl font-black leading-tight max-w-[720px]">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Referanslarımız</span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg font-normal leading-relaxed max-w-[720px]">
                    Bize güvenen ve kalitemizi tercih eden değerli kurumlarımız.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 p-0">
                {REFERENCES.map((ref, i) => (
                  <div key={i} className="group relative flex flex-col items-center justify-center gap-4 p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 min-h-[200px]">
                    <div className={`w-24 h-24 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 p-3`}>
                      {ref.logo ? (
                        <Image
                          src={ref.logo}
                          alt={`${ref.name} Logo - Outdoor Giyim Toptan Referans`}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `<span class="material-symbols-outlined text-gray-600 dark:text-gray-300 text-4xl">business</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-4xl">business</span>
                      )}
                    </div>
                    <h3 className="font-bold text-[#0d141b] dark:text-slate-50 text-lg text-center leading-tight">
                      {ref.name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}