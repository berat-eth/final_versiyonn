const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// Story modeli (geçici olarak burada tanımlıyoruz)
const Story = {
  id: 1,
  title: 'Yeni Koleksiyon',
  description: 'Huğlu Outdoor yeni koleksiyonu keşfedin',
  imageUrl: 'https://api.plaxsy.com/api/stories/sample1.jpg',
  thumbnailUrl: 'https://api.plaxsy.com/api/stories/thumb1.jpg',
  isActive: true,
  order: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: null,
  clickAction: {
    type: 'category',
    value: 'yeni-koleksiyon'
  }
};

// Geçici veri deposu (gerçek uygulamada veritabanı kullanılmalı)
let stories = [
  {
    id: 1,
    title: 'Yeni Koleksiyon',
    description: 'Huğlu Outdoor yeni koleksiyonu keşfedin',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: null,
    clickAction: {
      type: 'category',
      value: 'yeni-koleksiyon'
    }
  },
  {
    id: 2,
    title: 'Kamp Ürünleri',
    description: 'Kamp için gerekli tüm ekipmanlar',
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=100&h=100&fit=crop',
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: null,
    clickAction: {
      type: 'category',
      value: 'kamp-urunleri'
    }
  },
  {
    id: 3,
    title: 'Özel İndirim',
    description: 'Sadece bugün geçerli %30 indirim',
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&h=100&fit=crop',
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 saat sonra
    clickAction: {
      type: 'url',
      value: 'https://hugluoutdoor.com/indirim'
    }
  },
  {
    id: 4,
    title: 'Outdoor Giyim',
    description: 'Doğa sporları için özel tasarım',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-14b1e0d35b49?w=400&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-14b1e0d35b49?w=100&h=100&fit=crop',
    isActive: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: null,
    clickAction: {
      type: 'category',
      value: 'outdoor-giyim'
    }
  },
  {
    id: 5,
    title: 'Trekking Ekipmanları',
    description: 'Uzun yürüyüşler için profesyonel ekipman',
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=100&h=100&fit=crop',
    isActive: true,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: null,
    clickAction: {
      type: 'category',
      value: 'trekking-ekipmanlari'
    }
  }
];

// Aktif story'leri getir
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activeStories = stories
      .filter(story => story.isActive)
      .sort((a, b) => a.order - b.order)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: activeStories
    });
  } catch (error) {
    console.error('Story yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story yüklenirken hata oluştu'
    });
  }
});

// Tüm story'leri getir (admin için)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const allStories = stories
      .sort((a, b) => a.order - b.order)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: allStories
    });
  } catch (error) {
    console.error('Tüm story yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story yüklenirken hata oluştu'
    });
  }
});

// Yeni story oluştur
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      isActive = true,
      order = stories.length + 1,
      expiresAt,
      clickAction
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve resim URL\'si gerekli'
      });
    }

    const newStory = {
      id: Math.max(...stories.map(s => s.id)) + 1,
      title,
      description,
      imageUrl,
      thumbnailUrl,
      isActive,
      order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt,
      clickAction: clickAction || { type: 'none' }
    };

    stories.push(newStory);

    res.status(201).json({
      success: true,
      data: newStory
    });
  } catch (error) {
    console.error('Story oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story oluşturulurken hata oluştu'
    });
  }
});

// Story güncelle
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const storyIndex = stories.findIndex(s => s.id == id);

    if (storyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Story bulunamadı'
      });
    }

    const updatedStory = {
      ...stories[storyIndex],
      ...req.body,
      id: stories[storyIndex].id, // ID değiştirilemez
      updatedAt: new Date().toISOString()
    };

    stories[storyIndex] = updatedStory;

    res.json({
      success: true,
      data: updatedStory
    });
  } catch (error) {
    console.error('Story güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story güncellenirken hata oluştu'
    });
  }
});

// Story sil
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const storyIndex = stories.findIndex(s => s.id == id);

    if (storyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Story bulunamadı'
      });
    }

    stories.splice(storyIndex, 1);

    res.json({
      success: true,
      message: 'Story başarıyla silindi'
    });
  } catch (error) {
    console.error('Story silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story silinirken hata oluştu'
    });
  }
});

// Story durumunu değiştir
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const storyIndex = stories.findIndex(s => s.id == id);

    if (storyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Story bulunamadı'
      });
    }

    stories[storyIndex].isActive = !stories[storyIndex].isActive;
    stories[storyIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: stories[storyIndex]
    });
  } catch (error) {
    console.error('Story durum değiştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story durumu değiştirilirken hata oluştu'
    });
  }
});

// Story sıralamasını güncelle
router.patch('/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { storyIds } = req.body;

    if (!Array.isArray(storyIds)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıralama verisi'
      });
    }

    // Story'leri yeni sıraya göre güncelle
    storyIds.forEach((storyId, index) => {
      const storyIndex = stories.findIndex(s => s.id == storyId);
      if (storyIndex !== -1) {
        stories[storyIndex].order = index + 1;
        stories[storyIndex].updatedAt = new Date().toISOString();
      }
    });

    // Sıralamaya göre yeniden düzenle
    stories.sort((a, b) => a.order - b.order);

    res.json({
      success: true,
      message: 'Story sıralaması güncellendi'
    });
  } catch (error) {
    console.error('Story sıralama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story sıralaması güncellenirken hata oluştu'
    });
  }
});

module.exports = router;
