'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { slidersApi } from '@/utils/api'

const Header = dynamic(() => import('@/components/Header'), { ssr: true })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: true })

interface SliderItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
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

  useEffect(() => {
    // Popup'ı sadece ana sayfada ve her sayfa yenilendiğinde göster
    if (pathname === '/') {
      setShowPopup(true)
    } else {
      setShowPopup(false)
    }
  }, [pathname])

  // Load sliders from API
  useEffect(() => {
    const loadSliders = async () => {
      try {
        setLoadingSliders(true)
        const response = await slidersApi.getSliders(10)
        if (response.success && response.data && Array.isArray(response.data)) {
          const activeSliders = response.data.filter(slider => slider.isActive)
          setSlides(activeSliders)
        } else {
          setSlides([])
        }
      } catch (error) {
        console.error('Slider yükleme hatası:', error)
        setSlides([])
      } finally {
        setLoadingSliders(false)
      }
    }
    loadSliders()
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

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-scaleIn">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex flex-col gap-6 text-center">
              <div className="flex justify-center mb-2">
                <Image
                  src="/assets/logo.png"
                  alt="Huğlu Tekstil Atölyesi Logo"
                  width={140}
                  height={56}
                  className="h-14 w-auto object-contain"
                  quality={90}
                  priority
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Hoş Geldiniz!
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-base">
                  Hangi hizmeti arıyorsunuz?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetailClick}
                  className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined">storefront</span>
                  <span>Perakende Satış</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>

                <button
                  onClick={handleCustomClick}
                  className="group flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined">design_services</span>
                  <span>Toptan ve Özel Üretim</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="layout-container flex h-full grow flex-col">
        <Header />

        <main className="flex-grow">
          {/* Hero Slider Section - Full Screen */}
          <div className="relative">
            <div className="relative overflow-hidden shadow-2xl h-screen">
              {/* Slides */}
              {loadingSliders ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-lg">Yükleniyor...</div>
                </div>
              ) : slides.length > 0 ? (
                slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                  >
                    <div className="relative flex h-full flex-col gap-6 items-center justify-center p-6">
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title}
                        fill
                        priority={index === 0}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        quality={index === 0 ? 85 : 70}
                        sizes="100vw"
                        className="object-cover -z-10"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQAD8AElzOveIckqyjLh4m6jWyH54N6qHQ0X1B5fdnLm4iQfdSklRDq9zX//2Q=="
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70 -z-5"></div>
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

                      <div className="relative z-10 flex flex-col gap-4 text-center max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-2 mx-auto">
                          <span className="material-symbols-outlined text-white text-sm">workspace_premium</span>
                          <span className="text-sm font-semibold text-white">Türkiye'nin Güvenilir Markası</span>
                        </div>
                        <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tight drop-shadow-2xl">
                          {slide.title}
                        </h1>
                        {slide.description && (
                          <h2 className="text-white/90 text-lg md:text-xl font-medium leading-relaxed drop-shadow-lg">
                            {slide.description}
                          </h2>
                        )}
                      </div>
                      <div className="relative z-10 flex-wrap gap-4 flex justify-center">
                        <Link href="/urunler" className="group flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-base font-bold shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105 transition-all duration-300">
                          <span>Ürünlerimizi Keşfedin</span>
                          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </Link>
                        <Link href="/teklif-al" className="group flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-8 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white text-base font-bold hover:bg-white/20 hover:scale-105 transition-all duration-300">
                          <span>Teklif Alın</span>
                          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">request_quote</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : null}

              {/* Navigation Dots */}
              {slides.length > 0 && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 -ml-[100px] z-20 flex gap-3">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`transition-all duration-300 rounded-full ${index === currentSlide
                        ? 'w-12 h-3 bg-white'
                        : 'w-3 h-3 bg-white/50 hover:bg-white/75'
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation Arrows */}
              {slides.length > 0 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full border border-white/30 transition-all duration-300 group"
                    aria-label="Previous slide"
                  >
                    <span className="material-symbols-outlined text-white text-2xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
                  </button>
                  <button
                    onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full border border-white/30 transition-all duration-300 group"
                    aria-label="Next slide"
                  >
                    <span className="material-symbols-outlined text-white text-2xl group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
                </>
              )}

              {/* Scroll Down Indicator */}
              <button
                onClick={() => {
                  const nextSection = document.getElementById('why-us-section')
                  nextSection?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white hover:scale-110 transition-all duration-300 animate-bounce"
                aria-label="Scroll down"
              >
                <span className="text-sm font-semibold">Aşağı Kaydır</span>
                <span className="material-symbols-outlined text-3xl">keyboard_arrow_down</span>
              </button>
            </div>
          </div>

          <div className="px-4 md:px-10 lg:px-20 py-8">
            <div className="layout-content-container flex flex-col max-w-[1200px] mx-auto flex-1">
              {/* Why Us Section */}
              <div id="why-us-section" className="flex flex-col gap-10 px-4 py-16 @container">
                <div className="flex flex-col gap-6 items-center text-center">
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-2 mx-auto">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">star</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Avantajlarımız</span>
                    </div>
                    <h1 className="text-[#0d141b] dark:text-slate-50 tracking-tight text-4xl md:text-5xl font-black leading-tight max-w-[720px]">
                      Neden <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Biz?</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg font-normal leading-relaxed max-w-[720px]">
                      Yılların tecrübesi, kaliteli kumaşlar ve modern tasarımlarla işinize değer katıyoruz. Müşteri memnuniyeti odaklı yaklaşımımızla her zaman yanınızdayız.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 p-0">
                  <div className="group flex flex-1 gap-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 transition-all duration-300">
                      <span className="material-symbols-outlined text-white text-5xl">verified</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-[#0d141b] dark:text-slate-50 text-xl font-bold leading-tight">Kaliteli Malzeme</h2>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-normal leading-relaxed">Kıyafetlerimizde sadece en kaliteli ve dayanıklı kumaşları kullanıyoruz.</p>
                    </div>
                  </div>
                  <div className="group flex flex-1 gap-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 group-hover:scale-110 transition-all duration-300">
                      <span className="material-symbols-outlined text-white text-5xl">design_services</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-[#0d141b] dark:text-slate-50 text-xl font-bold leading-tight">Özelleştirilmiş Tasarım</h2>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-normal leading-relaxed">İhtiyaçlarınıza ve markanıza özel tasarımlar sunuyoruz.</p>
                    </div>
                  </div>
                  <div className="group flex flex-1 gap-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 hover:border-pink-300 dark:hover:border-pink-600">
                    <div className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/50 group-hover:scale-110 transition-all duration-300">
                      <span className="material-symbols-outlined text-white text-5xl">local_shipping</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-[#0d141b] dark:text-slate-50 text-xl font-bold leading-tight">Hızlı Teslimat</h2>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-normal leading-relaxed">Siparişlerinizi zamanında ve eksiksiz olarak teslim ediyoruz.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* References */}
              <div className="flex flex-col gap-10 px-4 py-16 @container">
                <div className="flex flex-col gap-6 items-center text-center">
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-2 mx-auto">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">business</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Referanslarımız</span>
                    </div>
                    <h1 className="text-[#0d141b] dark:text-slate-50 tracking-tight text-4xl md:text-5xl font-black leading-tight max-w-[720px]">
                      <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Referanslarımız</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg font-normal leading-relaxed max-w-[720px]">
                      Bize güvenen ve kalitemizi tercih eden değerli kurumlarımız.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-0 max-w-5xl mx-auto">
                  {/* Referanslar API'den gelecek şekilde düzenlenebilir */}
                </div>
              </div>

              {/* CTA Section */}
              <div className="@container">
                <div className="relative overflow-hidden flex flex-col justify-end gap-6 px-6 py-16 @[480px]:gap-8 @[480px]:px-12 @[480px]:py-24 rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-2xl">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full -ml-36 -mb-36"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
                    <div className="absolute top-10 right-20 w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-20 left-32 w-3 h-3 bg-white/30 rounded-full animate-pulse delay-100"></div>
                    <div className="absolute top-32 left-16 w-2 h-2 bg-white/50 rounded-full animate-pulse delay-200"></div>
                  </div>

                  <div className="relative z-10 flex flex-col gap-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 mb-2 mx-auto">
                      <span className="material-symbols-outlined text-white text-sm">rocket_launch</span>
                      <span className="text-sm font-semibold text-white">Hemen Başlayın</span>
                    </div>
                    <h1 className="text-white tracking-tight text-4xl md:text-5xl font-black leading-tight max-w-[720px] mx-auto drop-shadow-lg">
                      Kendi İş Kıyafetinizi Tasarlayın
                    </h1>
                    <p className="text-white/90 text-lg font-normal leading-relaxed max-w-[720px] mx-auto">
                      Hayalinizdeki tasarımı bize anlatın, gerçeğe dönüştürelim. Profesyonel ekibimizle markanızın kimliğini yansıtan özel kıyafetler hazırlayalım.
                    </p>
                  </div>
                  <div className="relative z-10 flex flex-1 justify-center">
                    <Link href="/teklif-al" className="group flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-8 bg-white text-purple-600 text-base font-bold shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300">
                      <span>Hemen Başla</span>
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
