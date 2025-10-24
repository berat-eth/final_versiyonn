const express = require('express');
const router = express.Router();
const { poolWrapper } = require('../orm/sequelize');

// JSON yedek endpoint'i (mevcut)
router.get('/', async (req, res) => {
  try {
    console.log('📦 JSON backup requested');
    
    // Tüm tabloları al
    const tables = [
      'users', 'products', 'categories', 'orders', 'cart_items',
      'campaigns', 'discount_codes', 'stories', 'sliders', 'flash_deals',
      'live_users', 'user_activities', 'admin_logs'
    ];
    
    const backupData = {};
    
    for (const table of tables) {
      try {
        const [rows] = await poolWrapper.execute(`SELECT * FROM ${table}`);
        backupData[table] = rows;
        console.log(`✅ Table ${table}: ${rows.length} records`);
      } catch (error) {
        console.warn(`⚠️ Table ${table} not found or error:`, error.message);
        backupData[table] = [];
      }
    }
    
    // Metadata ekle
    backupData._metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      format: 'json',
      tables: Object.keys(backupData).filter(key => key !== '_metadata'),
      totalRecords: Object.values(backupData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    };
    
    res.json(backupData);
  } catch (error) {
    console.error('❌ JSON backup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Backup oluşturulamadı',
      error: error.message 
    });
  }
});

// SQL yedek endpoint'i (yeni)
router.get('/sql', async (req, res) => {
  try {
    console.log('🗄️ SQL backup requested');
    
    let sqlBackup = '';
    const timestamp = new Date().toISOString();
    
    // SQL başlığı
    sqlBackup += `-- SQL Backup\n`;
    sqlBackup += `-- Generated: ${timestamp}\n`;
    sqlBackup += `-- Database: ${process.env.DB_NAME || 'huglu_outdoor'}\n`;
    sqlBackup += `-- Version: 1.0\n\n`;
    
    // SET komutları
    sqlBackup += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    sqlBackup += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
    sqlBackup += `SET AUTOCOMMIT = 0;\n`;
    sqlBackup += `START TRANSACTION;\n`;
    sqlBackup += `SET time_zone = "+00:00";\n\n`;
    
    // Tabloları al
    const [tables] = await poolWrapper.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);
    
    console.log(`📋 Found ${tables.length} tables`);
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      try {
        // Tablo yapısını al
        const [createTable] = await poolWrapper.execute(`SHOW CREATE TABLE ${tableName}`);
        if (createTable && createTable[0]) {
          sqlBackup += `-- Table structure for table \`${tableName}\`\n`;
          sqlBackup += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
          sqlBackup += `${createTable[0]['Create Table']};\n\n`;
        }
        
        // Tablo verilerini al
        const [rows] = await poolWrapper.execute(`SELECT * FROM ${tableName}`);
        
        if (rows.length > 0) {
          sqlBackup += `-- Data for table \`${tableName}\`\n`;
          
          // INSERT komutlarını oluştur
          const columns = Object.keys(rows[0]);
          const columnNames = columns.map(col => `\`${col}\``).join(', ');
          
          for (const row of rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (typeof value === 'boolean') return value ? '1' : '0';
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return value;
            }).join(', ');
            
            sqlBackup += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${values});\n`;
          }
          
          sqlBackup += `\n`;
          console.log(`✅ Table ${tableName}: ${rows.length} records exported`);
        } else {
          sqlBackup += `-- No data for table \`${tableName}\`\n\n`;
          console.log(`📭 Table ${tableName}: No data`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error processing table ${tableName}:`, error.message);
        sqlBackup += `-- Error processing table \`${tableName}\`: ${error.message}\n\n`;
      }
    }
    
    // Son komutlar
    sqlBackup += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sqlBackup += `COMMIT;\n`;
    sqlBackup += `-- Backup completed at ${new Date().toISOString()}\n`;
    
    console.log(`✅ SQL backup completed: ${sqlBackup.length} characters`);
    
    res.json({
      success: true,
      sql: sqlBackup,
      metadata: {
        timestamp,
        format: 'sql',
        size: sqlBackup.length,
        tables: tables.length,
        totalRecords: sqlBackup.split('INSERT INTO').length - 1
      }
    });
    
  } catch (error) {
    console.error('❌ SQL backup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'SQL backup oluşturulamadı',
      error: error.message 
    });
  }
});

// Restore endpoint'i
router.post('/restore', async (req, res) => {
  try {
    const { data, format } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Restore verisi bulunamadı' 
      });
    }
    
    console.log(`🔄 Restore requested: ${format || 'unknown'} format`);
    
    if (format === 'sql') {
      // SQL restore
      const sqlCommands = data.split(';').filter(cmd => cmd.trim());
      
      for (const sql of sqlCommands) {
        if (sql.trim()) {
          await poolWrapper.execute(sql.trim());
        }
      }
      
      console.log(`✅ SQL restore completed: ${sqlCommands.length} commands`);
      
    } else {
      // JSON restore
      for (const [tableName, records] of Object.entries(data)) {
        if (tableName.startsWith('_')) continue;
        
        if (Array.isArray(records) && records.length > 0) {
          // Tabloyu temizle
          await poolWrapper.execute(`DELETE FROM ${tableName}`);
          
          // Verileri ekle
          for (const record of records) {
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = columns.map(() => '?').join(', ');
            
            await poolWrapper.execute(
              `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
          }
          
          console.log(`✅ Table ${tableName}: ${records.length} records restored`);
        }
      }
      
      console.log(`✅ JSON restore completed`);
    }
    
    res.json({
      success: true,
      message: 'Restore başarıyla tamamlandı'
    });
    
  } catch (error) {
    console.error('❌ Restore error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Restore başarısız',
      error: error.message 
    });
  }
});

module.exports = router;
