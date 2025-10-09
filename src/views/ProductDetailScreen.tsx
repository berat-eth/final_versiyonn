import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductController } from '../controllers/ProductController';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { ReviewController } from '../controllers/ReviewController';
import { Product, Review, ProductVariationOption } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ReviewForm } from '../components/ReviewForm';
import { ReviewList } from '../components/ReviewList';
// VariationSelector removed
import { ProductVariationService } from '../services/ProductVariationService';
import { Colors } from '../theme/colors';
import { ModernButton } from '../components/ui/ModernButton';
import { SocialShareButtons } from '../components/SocialShareButtons';
import { ImageGallery } from '../components/ImageGallery';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslatedProductName, getTranslatedProductDescription, getTranslatedProductBrand, getTranslatedProductCategory, getTranslatedVariationName } from '../utils/translationUtils';
import { PurchaseVerificationService } from '../services/PurchaseVerificationService';
import * as FileSystem from 'expo-file-system';
import { NetworkMonitor } from '../utils/performance-utils';

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { t, currentLanguage, isLoading: languageLoading } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canUserReview, setCanUserReview] = useState<boolean | null>(null);
  const [reviewEligibilityReason, setReviewEligibilityReason] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: ProductVariationOption }>({});
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [showViewer, setShowViewer] = useState<boolean>(false);

  const { productId } = route.params;

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Ürün verilerini paralel yükle
      const [productResult] = await Promise.allSettled([
        loadProduct()
      ]);
      
      if (!mounted) return;
      
      // Kullanıcı önbellekten hızlıca (ağ beklemeden) al, sonra favori kontrolü yap
      const quick = await UserController.getCachedUserQuick();
      if (quick) {
        setCurrentUser(quick);
        // Yorum yapma yetkisini kontrol et
        await checkReviewEligibility();
      }
      checkIfFavorite();
    })();
    
    // Rastgele izleyici sayısı üret ve göster
    const count = Math.floor(Math.random() * 20) + 1; // 1..20
    setViewerCount(count);
    setShowViewer(true);
    const hideTimer = setTimeout(() => setShowViewer(false), 8000); // 8 sn sonra gizle
    return () => { mounted = false; clearTimeout(hideTimer); };
  }, [productId]);

  useEffect(() => {
    if (product) {
      // Hesaplamaları hafiflet - sadece gerekli durumlarda çalıştır
      const hasVariations = product.variations && product.variations.length > 0;
      const hasSelectedOptions = Object.keys(selectedOptions).length > 0;
      
      // Sadece varyasyon varsa ve seçim yapılmışsa hesapla
      if (hasVariations && hasSelectedOptions) {
        calculateCurrentPrice();
        calculateCurrentStock();
      } else if (!hasVariations) {
        // Varyasyon yoksa sadece temel fiyat ve stok
        setCurrentPrice(product.price);
        setCurrentStock(product.stock);
      }
    }
  }, [product, selectedOptions]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const prod = await ProductController.getProductById(productId);
      setProduct(prod);
      setCurrentPrice(prod?.price || 0);
      setCurrentStock(prod?.stock || 0);
      
      // Loading'i hemen kapat - UI'ı bloklamasın
      setLoading(false);
      
      // Yorumları arka planda sadece bu ürün için yükle
      loadReviews().catch(() => {});

      // Görselleri arka planda önbelleğe indir (ağ tipine göre kalite/boyut seç)
      setTimeout(() => {
        try {
          const isWifi = NetworkMonitor.getConnectionType() === 'wifi';
          const images = (prod?.images || []).slice(0, 3);
          // Eşzamanlı indirme sayısını düşür
          const downloadPromises = images.map(async (uri: string, index: number) => {
            if (!uri) return;
            // Basit kalite değişimi: Wi‑Fi değilse medium varyantı iste
            const optimized = optimizeImageUrl(uri, isWifi ? 'large' : 'medium');
            // Staggered download - her 200ms'de bir başlat
            await new Promise(resolve => setTimeout(resolve, index * 200));
            const filename = encodeURIComponent((optimized || uri).split('/').pop() || `img_${Date.now()}.jpg`);
            const local = `${FileSystem.cacheDirectory}${filename}`;
            try {
              const info = await FileSystem.getInfoAsync(local);
              if (!info.exists) {
                await FileSystem.downloadAsync(optimized || uri, local, { cache: true });
              }
            } catch {}
          });
          Promise.all(downloadPromises).catch(() => {});
        } catch {}
      }, 0);
    } catch (error) {
      console.error('Error loading product:', error);
      setLoading(false);
    }
  };

  const calculateCurrentPrice = () => {
    if (!product) return;
    
    // Varyasyonlar ürün fiyatına ek fiyat eklemesin
    setCurrentPrice(product.price);
  };

  const calculateCurrentStock = () => {
    if (!product) return;
    const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
    
    if (!hasVariationsArray || Object.keys(selectedOptions).length === 0) {
      setCurrentStock(product.stock);
      return;
    }

    // Get minimum stock from selected options using the service
    const minStock = ProductVariationService.getMinimumStock(selectedOptions);
    setCurrentStock(minStock);
  };


  const handleVariationChange = (newSelectedOptions: { [key: string]: ProductVariationOption }) => {
    setSelectedOptions(newSelectedOptions);
  };

  const isAllVariationsSelected = () => {
    if (!product) return true;
    const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
    if (!hasVariationsArray) return true;
    return ProductVariationService.areAllVariationsSelected((product.variations as any[]) || [], selectedOptions);
  };

  const getSelectedVariationString = () => {
    if (!product) return '';
    const hasVariationsArray = Array.isArray(product.variations) && product.variations.length > 0;
    if (!hasVariationsArray) return '';
    return ProductVariationService.getSelectedVariationString((product.variations as any[]) || [], selectedOptions);
  };

  // Beden seçimi için yardımcılar
  const getSizeVariationIds = (): string[] => {
    try {
      const variationsArray: any[] = Array.isArray((product as any)?.variations) ? ((product as any).variations as any[]) : [];
      const ids: string[] = [];
      const sizeLike = (name: string = '') => {
        const n = (name || '').toLowerCase();
        return n.includes('beden') || n.includes('size') || n.includes('numara');
      };
      variationsArray.forEach((v: any) => {
        const vid = String(v.id ?? v.name ?? 'var');
        if (sizeLike(v.name || '')) ids.push(vid);
      });
      return ids;
    } catch { return []; }
  };

  const isSizeSelectionRequired = (): boolean => {
    const sizeIds = getSizeVariationIds();
    return sizeIds.length > 0;
  };

  const isSizeSelected = (): boolean => {
    const sizeIds = getSizeVariationIds();
    if (sizeIds.length === 0) return true;
    return sizeIds.every(id => !!selectedOptions[id]);
  };

  // Basit inline varyasyon seçici (beden/renk vs.)
  const renderVariationSelector = () => {
    try {
      const variationsArray: any[] = Array.isArray((product as any)?.variations) ? ((product as any).variations as any[]) : [];
      if (!variationsArray || variationsArray.length === 0) return null;

      return (
        <View>
          {variationsArray.map((variation: any) => {
            const variationId = String(variation.id ?? variation.name ?? 'var');
            const options: any[] = Array.isArray(variation.options) ? variation.options : [];
            return (
              <View key={variationId} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
                  {variation.name || 'Varyasyon'}
                </Text>
                <View style={styles.availableSizes}>
                  {options.map((opt: any, idx: number) => {
                    const isSelected = selectedOptions[variationId]?.value === opt.value;
                    const disabled = (opt.stock ?? 0) <= 0;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.sizeChip, isSelected && { backgroundColor: '#111827', borderColor: '#111827' }, disabled && { opacity: 0.5 }]}
                        onPress={() => {
                          if (disabled) return;
                          const next: any = { ...selectedOptions };
                          next[variationId] = {
                            ...(opt as ProductVariationOption),
                            value: String(opt.value || ''),
                            priceModifier: Number(opt.priceModifier || 0),
                            stock: Number(opt.stock || 0)
                          } as any;
                          setSelectedOptions(next);
                        }}
                        disabled={disabled}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.sizeText, isSelected && { color: '#FFFFFF' }]}>{String(opt.value || '-')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      );
    } catch {
      return null;
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await UserController.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        await loadUserReview(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const productReviews = await ReviewController.getReviewsByProductId(productId);
      setReviews(productReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadUserReview = async (userId: number) => {
    try {
      const review = await ReviewController.getUserReview(productId, userId);
      setUserReview(review);
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  };

  const checkReviewEligibility = async () => {
    try {
      const eligibility = await PurchaseVerificationService.canUserReview(productId);
      setCanUserReview(eligibility.canReview);
      setReviewEligibilityReason(eligibility.reason || '');
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanUserReview(false);
      setReviewEligibilityReason(t('reviews.purchaseVerificationError'));
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!currentUser) {
      Alert.alert('Giriş Gerekli', 'Sepete eklemek için lütfen giriş yapın.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => navigation.navigate('Profile') }
      ]);
      return;
    }

    // Sadece beden seçimini zorunlu tut
    if (isSizeSelectionRequired() && !isSizeSelected()) {
      Alert.alert(
        'Beden Seçimi Gerekli', 
        'Bu ürünü sepete eklemek için önce beden seçimi yapmanız gerekiyor. Lütfen istediğiniz bedeni seçin.',
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
      return;
    }

    if (currentStock < quantity) {
      Alert.alert('Hata', 'Seçilen miktar stoktan fazla.');
      return;
    }

    setAddingToCart(true);
    try {
      const userId = currentUser.id;
      const result = await CartController.addToCart(
        userId,
        product.id,
        quantity,
        selectedOptions
      );

      if (result.success) {
        Alert.alert('Başarılı', result.message, [
          { text: 'Tamam' },
          { 
            text: 'Sepete Git', 
            onPress: () => navigation.navigate('Cart') 
          }
        ]);
        setQuantity(1);
        setSelectedOptions({});
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string, images?: string[]) => {
    if (!currentUser) {
      Alert.alert('Hata', 'Yorum yapmak için giriş yapmanız gerekiyor.');
      return;
    }

    setSubmittingReview(true);
    try {
      let result;
      
      if (userReview) {
        // Update existing review
        result = await ReviewController.updateReview(userReview.id, rating, comment);
      } else {
        // Add new review
        result = await ReviewController.addReview(
          productId,
          currentUser.id,
          currentUser.name,
          rating,
          comment,
          images
        );
      }

      if (result.success) {
        Alert.alert('Başarılı', result.message);
        setShowReviewForm(false);
        await loadReviews();
        await loadUserReview(currentUser.id);
        await loadProduct(); // Refresh product rating
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Yorum gönderilirken bir hata oluştu');
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const userId = 1; // Default guest user ID
      const favorites = await UserController.getUserFavorites(userId);
      const favoriteIds = favorites.map((fav: any) => parseInt(fav.productId));
      setIsFavorite(favoriteIds.includes(productId));
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const user = await UserController.getCurrentUser();
      if (!user) {
        Alert.alert('Giriş gerekli', 'Favorilere eklemek için lütfen giriş yapın.');
        return;
      }
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      
      if (isFavorite) {
        const success = await UserController.removeFromFavorites(userId, productId);
        if (success) {
          setIsFavorite(false);
          Alert.alert('Başarılı', 'Ürün favorilerden çıkarıldı');
        } else {
          Alert.alert('Hata', 'Ürün favorilerden çıkarılamadı');
        }
      } else {
        const success = await UserController.addToFavorites(userId, productId, {
          name: product?.name,
          price: product?.price,
          image: product?.image,
          images: product?.images || [],
          brand: product?.brand,
          description: product?.description,
          category: product?.category,
          stock: product?.stock,
          rating: product?.rating,
          reviewCount: product?.reviewCount
        });
        if (success) {
          setIsFavorite(true);
          Alert.alert('Başarılı', 'Ürün favorilere eklendi');
        } else {
          Alert.alert('Hata', 'Ürün favorilere eklenemedi');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Hata', 'Favori işlemi sırasında bir hata oluştu');
    }
  };

  const handleReviewUpdate = async () => {
    await loadReviews();
    if (currentUser) {
      await loadUserReview(currentUser.id);
    }
    await loadProduct(); // Refresh product rating
  };

  const increaseQuantity = () => {
    if (quantity < currentStock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading || languageLoading) {
    return <LoadingIndicator />;
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Ürün bulunamadı</Text>
      </View>
    );
  }

  // Galeri görsellerini ürünle ilişkili olacak şekilde filtrele
  const gatherGalleryImages = (): string[] => {
    // Boşları at, tekrarları kaldır; tüm geçerli görselleri göster
    const candidates: (string | undefined)[] = [
      product.image1,
      product.image2,
      product.image3,
      product.image4,
      product.image5,
    ];
    const arrayImages = Array.isArray(product.images) ? product.images.filter((u: any) => typeof u === 'string') : [];
    const list: string[] = [...candidates.filter((u): u is string => typeof u === 'string'), ...arrayImages]
      .filter((u: string) => u.trim() !== '');

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const u of list) {
      const key = u.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(u);
      }
    }

    // Çok fazlaysa ilk 15 ile sınırla
    return unique.slice(0, 15);
  };

  const galleryImages = gatherGalleryImages();

  // Basit URL optimizasyonu: ticimax cloud için "buyuk" → "orta"/"kucuk" varyantı dene
  function optimizeImageUrl(url: string, quality: 'large' | 'medium' = 'large'): string | null {
    try {
      if (!url) return null;
      if (quality === 'large') return url;
      // Heuristik: /UrunResimleri/buyuk/ → medium için /orta/, düşük için /kucuk/
      const medium = url.replace(/\/UrunResimleri\/buyuk\//i, '/UrunResimleri/orta/');
      if (medium !== url) return medium;
      return url;
    } catch { return null; }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {showViewer && (
          <View style={styles.viewerToast}>
            <Icon name="visibility" size={16} color="#1A1A1A" />
            <Text style={styles.viewerToastText}>Bu ürünü şu anda {viewerCount} kişi inceliyor</Text>
          </View>
        )}
        {/* Ana Görsel Galerisi */}
        <View style={styles.imageContainer}>
          <ImageGallery
            images={galleryImages?.slice(0, 10) || []} // İlk 10 görseli göster
            mainImage={product.image || galleryImages?.[0] || 'https://via.placeholder.com/400x400?text=No+Image'}
            style={styles.imageGallery}
            showThumbnails={true}
            onImagePress={(imageUrl, index) => {
              // Görsel tam ekran gösterimi - ImageGallery bileşeni otomatik olarak modal açar
              console.log('Image pressed:', imageUrl, index);
            }}
          />
          
          {/* Favori Butonu */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <Icon
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              color={isFavorite ? Colors.secondary : Colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{getTranslatedProductName(product, currentLanguage)}</Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.rating}>{product.rating}</Text>
            <Text style={styles.reviewCount}>
              ({product.reviewCount} değerlendirme)
            </Text>
          </View>

          <Text style={styles.price}>
            {ProductController.formatPrice(currentPrice)}
          </Text>

          {/* Mevcut Bedenler (seçim zorunlu, stokta olmayanlar kırmızı çarpı ile) */}
          {Array.isArray(product.variations) && product.variations.length > 0 && (() => {
            const sizeLike = (name: string = '') => {
              const n = (name || '').toLowerCase();
              return n.includes('beden') || n.includes('size') || n.includes('numara');
            };
            const sizeVariations: any[] = (product.variations as any[]).filter(v => sizeLike(v.name || '')) as any[];
            if (!sizeVariations || sizeVariations.length === 0) return null;
            return (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.variationLabel}>Mevcut Bedenler</Text>
                {sizeVariations.map((variation: any) => {
                  const variationId = String(variation.id ?? variation.name ?? 'var');
                  const options: any[] = Array.isArray(variation.options) ? variation.options : [];
                  return (
                    <View key={variationId} style={styles.availableSizes}>
                      {options.map((opt: any, idx: number) => {
                        const disabled = Number(opt?.stock || 0) <= 0;
                        const isSelected = String(selectedOptions[variationId]?.value) === String(opt.value);
                        return (
                          <TouchableOpacity
                            key={`${variationId}-${idx}`}
                            style={[
                              styles.sizeChip,
                              isSelected && { backgroundColor: '#111827', borderColor: '#111827' },
                              disabled && { opacity: 0.6 }
                            ]}
                            onPress={() => {
                              if (disabled) return;
                              const next: any = { ...selectedOptions };
                              next[variationId] = {
                                ...(opt as ProductVariationOption),
                                value: String(opt.value || ''),
                                stock: Number(opt.stock || 0)
                              } as any;
                              setSelectedOptions(next);
                            }}
                            disabled={disabled}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.sizeText, isSelected && { color: '#FFFFFF' }]}>
                              {String(opt.value || '-')}
                            </Text>
                            {disabled && (
                              <View style={{ position: 'absolute', right: -6, top: -8 }}>
                                <Text style={{ color: '#FF3B30', fontWeight: '800', fontSize: 14 }}>🚫</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                {!isSizeSelected() && (
                  <View style={styles.variationWarning}>
                    <Icon name="warning" size={20} color="#FF6B35" />
                    <Text style={styles.variationWarningText}>Sepete eklemek için beden seçimi yapmanız gerekiyor!</Text>
                  </View>
                )}
              </View>
            );
          })()}

          <View style={styles.stockContainer}>
            {currentStock > 0 ? (
              <>
                <Text style={styles.stockText}>Stok: {currentStock} adet</Text>
                {currentStock < 5 && (
                  <Text style={styles.lowStock}>Son {currentStock} adet!</Text>
                )}
              </>
            ) : (
              <Text style={styles.outOfStock}>Tükendi</Text>
            )}
          </View>

          {/* Varyasyonlar bölümü kaldırıldı */}

          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>{t('productDetail.description')}</Text>
            <Text style={styles.description}>{getTranslatedProductDescription(product, currentLanguage)}</Text>
          </View>

          {/* XML'den gelen ek bilgiler (varsa) */}
          {(product.categoryTree || product.productUrl || product.salesUnit || typeof product.totalImages === 'number') && (
            <View style={styles.extraCard}>
              <View style={styles.extraHeaderRow}>
                <Icon name="info" size={18} color="#1A1A1A" />
                <Text style={styles.extraHeaderText}>Ek Bilgiler</Text>
              </View>

              <View style={styles.extraChipsContainer}>
                {product.categoryTree ? (
                  <View style={styles.extraChip}>
                    <Icon name="category" size={16} color="#6b7280" />
                    <Text style={styles.extraChipLabel}>Kategori</Text>
                    <Text style={styles.extraChipValue} numberOfLines={1}>
                      {product.categoryTree}
                    </Text>
                  </View>
                ) : null}

                {product.salesUnit ? (
                  <View style={styles.extraChip}>
                    <Icon name="sell" size={16} color="#6b7280" />
                    <Text style={styles.extraChipLabel}>Satış Birimi</Text>
                    <Text style={styles.extraChipValue}>{product.salesUnit}</Text>
                  </View>
                ) : null}

                {typeof product.totalImages === 'number' ? (
                  <View style={styles.extraChip}>
                    <Icon name="image" size={16} color="#6b7280" />
                    <Text style={styles.extraChipLabel}>Görseller</Text>
                    <Text style={styles.extraChipValue}>{product.totalImages}</Text>
                  </View>
                ) : null}

                {product.productUrl ? (
                  <TouchableOpacity
                    style={[styles.extraChip, styles.extraLinkChip]}
                    onPress={() => {
                      try {
                        if (product.productUrl) Linking.openURL(product.productUrl);
                      } catch (_) {}
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="open-in-new" size={16} color="#1e3c72" />
                    <Text style={[styles.extraChipLabel, { color: '#1e3c72' }]}>Ürün Sayfası</Text>
                    <Text style={[styles.extraChipValue, { color: '#1e3c72' }]} numberOfLines={1}>
                      Aç
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* Sosyal Paylaşım Bölümü */}
          <SocialShareButtons
            productId={product.id.toString()}
            productName={getTranslatedProductName(product, currentLanguage)}
            productPrice={currentPrice}
            productImage={product.image}
            productBrand={product.brand}
            productDescription={getTranslatedProductDescription(product, currentLanguage)}
            onShareSuccess={(platform, expGained) => {
              console.log(`Paylaşım başarılı: ${platform}, +${expGained} EXP`);
            }}
          />

          {/* Review Section */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
              {currentUser && (
                <TouchableOpacity
                  style={[
                    styles.addReviewButton,
                    canUserReview === false && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (canUserReview === false) {
                      Alert.alert(
                        t('reviews.cannotReview'),
                        reviewEligibilityReason || t('reviews.purchaseRequired')
                      );
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                  disabled={canUserReview === false}
                >
                  <Text style={[
                    styles.addReviewButtonText,
                    canUserReview === false && styles.disabledButtonText
                  ]}>
                    {userReview ? 'Yorumumu Düzenle' : 'Yorum Yap'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <ReviewList
              reviews={reviews}
              currentUserId={currentUser?.id}
              onReviewUpdate={handleReviewUpdate}
            />
          </View>

          {currentStock > 0 && (
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Adet:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decreaseQuantity}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={increaseQuantity}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>


      {currentStock > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (addingToCart || (isSizeSelectionRequired() && !isSizeSelected())) && styles.disabledButton
            ]}
            onPress={handleAddToCart}
            disabled={addingToCart || (isSizeSelectionRequired() && !isSizeSelected())}
          >
            <Text style={styles.addToCartText}>
              {addingToCart ? 'Ekleniyor...' : (isSizeSelectionRequired() && !isSizeSelected() ? 'Beden Seçin' : 'Sepete Ekle')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ReviewForm
        visible={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleReviewSubmit}
        review={userReview}
        loading={submittingReview}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
  },
  imageGallery: {
    height: 400,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  brand: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '400',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 30,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingStar: {
    fontSize: 16,
    marginRight: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginRight: 6,
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: -1,
  },
  variationInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  variationLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  variationValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  stockContainer: {
    marginBottom: 24,
  },
  stockText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  lowStock: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 4,
    fontWeight: '500',
  },
  outOfStock: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  variationSection: {
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
  },
  variationSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  selectedVariationSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  selectedVariationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedVariationItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  selectedVariationLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    minWidth: 80,
  },
  selectedVariationValue: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
    fontWeight: '500',
  },
  priceModifier: {
    color: '#000000',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#48484A',
    lineHeight: 24,
    fontWeight: '400',
  },
  extraInfoContainer: {
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  extraCard: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  extraHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  extraHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  extraChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  extraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  extraLinkChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  extraChipLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extraChipValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  extraInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  extraInfoLabel: {
    minWidth: 120,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  extraInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 16,
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  quantity: {
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  addToCartButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#CCCCCC',
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewerToast: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewerToastText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  availableSizes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  sizeStockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sizeStockItem: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: 60,
  },
  sizeChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 56,
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  variationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
    marginBottom: 12,
  },
  variationWarningText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  disabledButtonText: {
    color: '#999999',
  },
});