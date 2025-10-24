const express = require('express');
const router = express.Router();

// In-memory storage for flash deals (temporary)
let flashDeals = [
  {
    id: 1,
    name: 'Kış Fırsatları',
    description: 'Kış ürünlerinde büyük indirimler',
    discountType: 'percentage',
    discountValue: 20,
    targetType: 'category',
    targetId: 1,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün sonra
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get all flash deals (admin)
router.get('/all', (req, res) => {
  try {
    console.log('📊 Admin flash deals requested');
    res.json({
      success: true,
      data: flashDeals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('❌ Error getting flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting flash deals' });
  }
});

// Get active flash deals (mobile app)
router.get('/', (req, res) => {
  try {
    const now = new Date();
    const activeDeals = flashDeals.filter(deal => 
      deal.isActive && 
      new Date(deal.startDate) <= now && 
      new Date(deal.endDate) >= now
    );
    
    console.log('⚡ Active flash deals found:', activeDeals.length);
    res.json({
      success: true,
      data: activeDeals
    });
  } catch (error) {
    console.error('❌ Error getting active flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting active flash deals' });
  }
});

// Create flash deal
router.post('/', (req, res) => {
  try {
    const { name, description, discountType, discountValue, targetType, targetId, startDate, endDate, isActive } = req.body;
    
    const newDeal = {
      id: flashDeals.length + 1,
      name,
      description,
      discountType,
      discountValue: parseFloat(discountValue),
      targetType,
      targetId: targetId ? parseInt(targetId) : null,
      startDate,
      endDate,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    flashDeals.push(newDeal);
    
    console.log('✅ Flash deal created:', newDeal.name);
    res.json({
      success: true,
      data: newDeal
    });
  } catch (error) {
    console.error('❌ Error creating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error creating flash deal' });
  }
});

// Update flash deal
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, discountType, discountValue, targetType, targetId, startDate, endDate, isActive } = req.body;
    
    const dealIndex = flashDeals.findIndex(deal => deal.id == id);
    if (dealIndex === -1) {
      return res.status(404).json({ success: false, message: 'Flash deal not found' });
    }
    
    const updatedDeal = {
      ...flashDeals[dealIndex],
      name,
      description,
      discountType,
      discountValue: parseFloat(discountValue),
      targetType,
      targetId: targetId ? parseInt(targetId) : null,
      startDate,
      endDate,
      isActive: isActive !== false,
      updatedAt: new Date().toISOString()
    };
    
    flashDeals[dealIndex] = updatedDeal;
    
    console.log('✅ Flash deal updated:', updatedDeal.name);
    res.json({
      success: true,
      data: updatedDeal
    });
  } catch (error) {
    console.error('❌ Error updating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error updating flash deal' });
  }
});

// Delete flash deal
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dealIndex = flashDeals.findIndex(deal => deal.id == id);
    
    if (dealIndex === -1) {
      return res.status(404).json({ success: false, message: 'Flash deal not found' });
    }
    
    const deletedDeal = flashDeals[dealIndex];
    flashDeals.splice(dealIndex, 1);
    
    console.log('✅ Flash deal deleted:', deletedDeal.name);
    res.json({
      success: true,
      message: 'Flash deal deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting flash deal:', error);
    res.status(500).json({ success: false, message: 'Error deleting flash deal' });
  }
});

// Toggle flash deal active status
router.patch('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const dealIndex = flashDeals.findIndex(deal => deal.id == id);
    if (dealIndex === -1) {
      return res.status(404).json({ success: false, message: 'Flash deal not found' });
    }
    
    flashDeals[dealIndex].isActive = isActive;
    flashDeals[dealIndex].updatedAt = new Date().toISOString();
    
    console.log('✅ Flash deal status toggled:', flashDeals[dealIndex].name, '->', isActive ? 'Active' : 'Inactive');
    res.json({
      success: true,
      data: flashDeals[dealIndex]
    });
  } catch (error) {
    console.error('❌ Error toggling flash deal status:', error);
    res.status(500).json({ success: false, message: 'Error toggling flash deal status' });
  }
});

module.exports = router;
