const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');

// Slider modeli (geçici olarak burada tanımlıyoruz)
let sliders = [
  {
    id: 1,
    title: 'Yeni Sezon',
    description: 'Outdoor Koleksiyonu - %50\'ye varan indirimler',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200',
    videoUrl: null,
    isActive: true,
    order: 1,
    autoPlay: true,
    duration: 5,
    clickAction: {
      type: 'category',
      value: 'yeni-koleksiyon'
    },
    buttonText: 'Keşfet',
    buttonColor: '#3B82F6',
    textColor: '#FFFFFF',
    overlayOpacity: 0.3,
    views: 12500,
    clicks: 850,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Kamp Sezonu',
    description: 'Doğa ile Buluşun - En iyi kamp ekipmanları',
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200',
    videoUrl: null,
    isActive: true,
    order: 2,
    autoPlay: true,
    duration: 7,
    clickAction: {
      type: 'category',
      value: 'kamp-urunleri'
    },
    buttonText: 'İncele',
    buttonColor: '#10B981',
    textColor: '#FFFFFF',
    overlayOpacity: 0.4,
    views: 9800,
    clicks: 650,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Avcılık',
    description: 'Profesyonel Avcılık - Av sezonu için hazır olun',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200',
    videoUrl: null,
    isActive: true,
    order: 3,
    autoPlay: false,
    duration: 6,
    clickAction: {
      type: 'category',
      value: 'avcilik'
    },
    buttonText: 'Keşfet',
    buttonColor: '#8B5CF6',
    textColor: '#FFFFFF',
    overlayOpacity: 0.5,
    views: 7200,
    clicks: 420,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Aktif slider'ları getir
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activeSliders = sliders
      .filter(slider => slider.isActive)
      .sort((a, b) => a.order - b.order)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: activeSliders
    });
  } catch (error) {
    console.error('Slider yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider yüklenirken hata oluştu'
    });
  }
});

// Tüm slider'ları getir (admin için)
router.get('/all', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const allSliders = sliders
      .sort((a, b) => a.order - b.order)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: allSliders
    });
  } catch (error) {
    console.error('Tüm slider yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider yüklenirken hata oluştu'
    });
  }
});

// Yeni slider oluştur
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      videoUrl,
      isActive = true,
      order = sliders.length + 1,
      autoPlay = true,
      duration = 5,
      clickAction = { type: 'none' },
      buttonText = 'Keşfet',
      buttonColor = '#3B82F6',
      textColor = '#FFFFFF',
      overlayOpacity = 0.3
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve resim URL\'si gerekli'
      });
    }

    const newSlider = {
      id: Math.max(...sliders.map(s => s.id)) + 1,
      title,
      description,
      imageUrl,
      thumbnailUrl,
      videoUrl,
      isActive,
      order,
      autoPlay,
      duration,
      clickAction,
      buttonText,
      buttonColor,
      textColor,
      overlayOpacity,
      views: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    sliders.push(newSlider);

    res.status(201).json({
      success: true,
      data: newSlider
    });
  } catch (error) {
    console.error('Slider oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider oluşturulurken hata oluştu'
    });
  }
});

// Slider güncelle
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sliderIndex = sliders.findIndex(s => s.id == id);

    if (sliderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    const updatedSlider = {
      ...sliders[sliderIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    sliders[sliderIndex] = updatedSlider;

    res.json({
      success: true,
      data: updatedSlider
    });
  } catch (error) {
    console.error('Slider güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider güncellenirken hata oluştu'
    });
  }
});

// Slider sil
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sliderIndex = sliders.findIndex(s => s.id == id);

    if (sliderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    sliders.splice(sliderIndex, 1);

    res.json({
      success: true,
      message: 'Slider silindi'
    });
  } catch (error) {
    console.error('Slider silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider silinirken hata oluştu'
    });
  }
});

// Slider durumunu değiştir
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const sliderIndex = sliders.findIndex(s => s.id == id);

    if (sliderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    sliders[sliderIndex].isActive = isActive;
    sliders[sliderIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: sliders[sliderIndex]
    });
  } catch (error) {
    console.error('Slider durumu değiştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider durumu değiştirilirken hata oluştu'
    });
  }
});

// Slider sıralamasını güncelle
router.patch('/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { sliderIds } = req.body;

    if (!Array.isArray(sliderIds)) {
      return res.status(400).json({
        success: false,
        message: 'Slider ID\'leri array olmalı'
      });
    }

    // Yeni sıralamaya göre slider'ları güncelle
    const reorderedSliders = [];
    sliderIds.forEach((id, index) => {
      const slider = sliders.find(s => s.id == id);
      if (slider) {
        slider.order = index + 1;
        slider.updatedAt = new Date().toISOString();
        reorderedSliders.push(slider);
      }
    });

    // Kalan slider'ları da güncelle
    sliders.forEach(slider => {
      if (!sliderIds.includes(slider.id)) {
        slider.order = sliders.length;
        slider.updatedAt = new Date().toISOString();
      }
    });

    res.json({
      success: true,
      message: 'Slider sıralaması güncellendi'
    });
  } catch (error) {
    console.error('Slider sıralama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider sıralaması güncellenirken hata oluştu'
    });
  }
});

// Slider tıklama sayısını artır
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const sliderIndex = sliders.findIndex(s => s.id == id);

    if (sliderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    sliders[sliderIndex].clicks = (sliders[sliderIndex].clicks || 0) + 1;
    sliders[sliderIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: sliders[sliderIndex]
    });
  } catch (error) {
    console.error('Slider tıklama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider tıklama kaydedilirken hata oluştu'
    });
  }
});

// Slider görüntülenme sayısını artır
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const sliderIndex = sliders.findIndex(s => s.id == id);

    if (sliderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    sliders[sliderIndex].views = (sliders[sliderIndex].views || 0) + 1;
    sliders[sliderIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: sliders[sliderIndex]
    });
  } catch (error) {
    console.error('Slider görüntülenme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider görüntülenme kaydedilirken hata oluştu'
    });
  }
});

module.exports = router;
