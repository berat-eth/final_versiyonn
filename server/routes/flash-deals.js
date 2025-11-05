const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');

// poolWrapper'ı global'dan almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için factory function
function createFlashDealsRouter(pool) {
  poolWrapper = pool;
  return router;
}

// Factory function olarak export et
module.exports = createFlashDealsRouter;

// Get all flash deals (admin)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    console.log('⚡ Admin requesting flash deals');

    const [rows] = await poolWrapper.execute(`
      SELECT fd.*
      FROM flash_deals fd
      ORDER BY fd.created_at DESC
    `);

    // Her flash deal için ürün ve kategori bilgilerini getir
    const dealsWithTargets = await Promise.all(rows.map(async (deal) => {
      const [products] = await poolWrapper.execute(`
        SELECT p.id, p.name, p.price, p.image, p.category, p.brand, p.description, 
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_products fdp
        JOIN products p ON fdp.product_id = p.id
        WHERE fdp.flash_deal_id = ?
      `, [deal.id]);

      const [categories] = await poolWrapper.execute(`
        SELECT c.id, c.name
        FROM flash_deal_categories fdc
        JOIN categories c ON fdc.category_id = c.id
        WHERE fdc.flash_deal_id = ?
      `, [deal.id]);

      return {
        ...deal,
        products: products || [],
        categories: categories || []
      };
    }));

    console.log('⚡ Flash deals found:', dealsWithTargets.length);
    res.json({ success: true, data: dealsWithTargets });
  } catch (error) {
    console.error('❌ Error getting flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting flash deals' });
  }
});

// Get active flash deals (mobile app)
router.get('/', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const now = new Date();

    const [rows] = await poolWrapper.execute(`
      SELECT fd.*
      FROM flash_deals fd
      WHERE fd.is_active = true 
        AND fd.start_date <= ? 
        AND fd.end_date >= ?
      ORDER BY fd.created_at DESC
    `, [now, now]);

    // Her flash deal için ürünleri getir (kategori bazlı ürünler dahil)
    const dealsWithProducts = await Promise.all(rows.map(async (deal) => {
      // Seçili ürünler
      const [products] = await poolWrapper.execute(`
        SELECT DISTINCT p.id, p.name, p.price, p.image, p.category, p.brand, p.description, 
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_products fdp
        JOIN products p ON fdp.product_id = p.id
        WHERE fdp.flash_deal_id = ?
      `, [deal.id]);

      // Seçili kategorilerdeki ürünler
      const [categoryProducts] = await poolWrapper.execute(`
        SELECT DISTINCT p.id, p.name, p.price, p.image, p.category, p.brand, p.description,
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_categories fdc
        JOIN categories c ON fdc.category_id = c.id
        JOIN products p ON p.category = c.name
        WHERE fdc.flash_deal_id = ?
      `, [deal.id]);

      // Birleştir ve duplicate'leri kaldır
      const allProducts = [...products, ...categoryProducts];
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
      );

      return {
        ...deal,
        products: uniqueProducts
      };
    }));

    console.log('⚡ Active flash deals found:', dealsWithProducts.length);
    res.json({ success: true, data: dealsWithProducts });
  } catch (error) {
    console.error('❌ Error getting active flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting active flash deals' });
  }
});

// Create flash deal
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { name, description, discount_type, discount_value, start_date, end_date, product_ids, category_ids, is_active } = req.body;

    console.log('⚡ Creating flash deal:', { name, discount_type, discount_value, product_ids, category_ids });

    // Validate required fields
    if (!name || !discount_type || discount_value === undefined || discount_value === null || !start_date || !end_date) {
      console.log('❌ Validation failed:', { name, discount_type, discount_value, start_date, end_date });
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik'
      });
    }
    
    // Validate discount value
    const discountValueNum = parseFloat(discount_value);
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'İndirim değeri 0\'dan büyük bir sayı olmalıdır'
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz indirim türü'
      });
    }

    // Validate at least one product or category selected
    const productIds = Array.isArray(product_ids) ? product_ids.filter(Boolean) : [];
    const categoryIds = Array.isArray(category_ids) ? category_ids.filter(Boolean) : [];
    
    if (productIds.length === 0 && categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir ürün veya kategori seçilmelidir'
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Bitiş tarihi başlangıç tarihinden sonra olmalı'
      });
    }

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Insert flash deal
      const [result] = await connection.execute(`
        INSERT INTO flash_deals (name, description, discount_type, discount_value, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [name, description || '', discount_type, discount_value, start_date, end_date, is_active !== undefined ? is_active : true]);

      const flashDealId = result.insertId;

      // Insert products
      if (productIds.length > 0) {
        for (const productId of productIds) {
          await connection.execute(`
            INSERT INTO flash_deal_products (flash_deal_id, product_id)
            VALUES (?, ?)
          `, [flashDealId, productId]);
        }
      }

      // Insert categories
      if (categoryIds.length > 0) {
        for (const categoryId of categoryIds) {
          await connection.execute(`
            INSERT INTO flash_deal_categories (flash_deal_id, category_id)
            VALUES (?, ?)
          `, [flashDealId, categoryId]);
        }
      }

      await connection.commit();
      console.log('⚡ Flash deal created with ID:', flashDealId);
      res.json({
        success: true,
        message: 'Flash indirim başarıyla oluşturuldu',
        data: { id: flashDealId }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error creating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error creating flash deal' });
  }
});

// Update flash deal
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const flashDealId = req.params.id;
    const { name, description, discount_type, discount_value, start_date, end_date, is_active, product_ids, category_ids } = req.body;

    console.log('⚡ Updating flash deal:', flashDealId);

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
      if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
      if (discount_type !== undefined) { updateFields.push('discount_type = ?'); updateValues.push(discount_type); }
      if (discount_value !== undefined) { updateFields.push('discount_value = ?'); updateValues.push(discount_value); }
      if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
      if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
      if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }

      if (updateFields.length > 0) {
        updateValues.push(flashDealId);
        const [result] = await connection.execute(`
          UPDATE flash_deals 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, updateValues);

        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Flash indirim bulunamadı'
          });
        }
      }

      // Update products if provided
      if (product_ids !== undefined) {
        await connection.execute('DELETE FROM flash_deal_products WHERE flash_deal_id = ?', [flashDealId]);
        const productIds = Array.isArray(product_ids) ? product_ids.filter(Boolean) : [];
        if (productIds.length > 0) {
          for (const productId of productIds) {
            await connection.execute(`
              INSERT INTO flash_deal_products (flash_deal_id, product_id)
              VALUES (?, ?)
            `, [flashDealId, productId]);
          }
        }
      }

      // Update categories if provided
      if (category_ids !== undefined) {
        await connection.execute('DELETE FROM flash_deal_categories WHERE flash_deal_id = ?', [flashDealId]);
        const categoryIds = Array.isArray(category_ids) ? category_ids.filter(Boolean) : [];
        if (categoryIds.length > 0) {
          for (const categoryId of categoryIds) {
            await connection.execute(`
              INSERT INTO flash_deal_categories (flash_deal_id, category_id)
              VALUES (?, ?)
            `, [flashDealId, categoryId]);
          }
        }
      }

      await connection.commit();
      console.log('⚡ Flash deal updated:', flashDealId);
      res.json({
        success: true,
        message: 'Flash indirim başarıyla güncellendi'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error updating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error updating flash deal' });
  }
});

// Delete flash deal
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const flashDealId = req.params.id;

    console.log('⚡ Deleting flash deal:', flashDealId);

    const [result] = await poolWrapper.execute(
      'DELETE FROM flash_deals WHERE id = ?',
      [flashDealId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flash indirim bulunamadı'
      });
    }

    console.log('⚡ Flash deal deleted:', flashDealId);
    res.json({
      success: true,
      message: 'Flash indirim başarıyla silindi'
    });
  } catch (error) {
    console.error('❌ Error deleting flash deal:', error);
    res.status(500).json({ success: false, message: 'Error deleting flash deal' });
  }
});

// Toggle flash deal active status
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;
    
    const [result] = await poolWrapper.execute(
      'UPDATE flash_deals SET is_active = ? WHERE id = ?',
      [isActive, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Flash deal not found' });
    }

    console.log('✅ Flash deal status toggled:', id, '->', isActive ? 'Active' : 'Inactive');
    res.json({
      success: true,
      message: 'Flash deal durumu güncellendi'
    });
  } catch (error) {
    console.error('❌ Error toggling flash deal status:', error);
    res.status(500).json({ success: false, message: 'Error toggling flash deal status' });
  }
});
