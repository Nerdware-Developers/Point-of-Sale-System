import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, authorize } from '../middleware/auth.js';
import Tesseract from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.memoryStorage(); // Use memory storage for OCR processing

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept all image formats
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/x-icon',
    ];
    
    // Check if it's an image type or if mimetype starts with image/
    if (file.mimetype.startsWith('image/') || allowedMimes.includes(file.mimetype.toLowerCase())) {
      return cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedMimes.join(', ')}`));
    }
  },
});

// Extract items from receipt using OCR
router.post('/scan', authenticate, authorize('admin'), upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No receipt image uploaded',
        details: 'Please select an image file'
      });
    }

    console.log(`Processing receipt image: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);

    // Process image with Tesseract OCR
    let text = '';
    try {
      const result = await Tesseract.recognize(
        req.file.buffer,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            } else if (m.status === 'loading tesseract core') {
              console.log('Loading Tesseract core...');
            } else if (m.status === 'initializing tesseract') {
              console.log('Initializing Tesseract...');
            } else if (m.status === 'loading language traineddata') {
              console.log('Loading language data...');
            }
          },
        }
      );
      text = result.data.text;
      console.log(`OCR completed. Extracted text length: ${text.length}`);
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      throw new Error(`OCR failed: ${ocrError.message}`);
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'No text found in image',
        details: 'The image may be too blurry, dark, or contain no readable text. Please try a clearer image.'
      });
    }

    // Parse receipt text to extract items
    const items = parseReceiptText(text);

    if (items.length === 0) {
      return res.json({
        success: true,
        items: [],
        rawText: text.substring(0, 500),
        message: 'Text extracted but no items found. The receipt format may not be recognized.'
      });
    }

    res.json({
      success: true,
      items,
      rawText: text.substring(0, 500), // Return first 500 chars for debugging
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to process receipt';
    if (error.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'File size too large. Maximum size is 10MB';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
});

// Parse receipt text to extract items
function parseReceiptText(text) {
  const items = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Common receipt patterns
  const pricePattern = /[\$]?(\d+\.?\d{0,2})/;
  const quantityPattern = /^(\d+)\s+/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip header/footer lines
    if (
      line.toLowerCase().includes('total') ||
      line.toLowerCase().includes('subtotal') ||
      line.toLowerCase().includes('tax') ||
      line.toLowerCase().includes('change') ||
      line.toLowerCase().includes('thank') ||
      line.toLowerCase().includes('receipt') ||
      line.toLowerCase().includes('date') ||
      line.toLowerCase().includes('time') ||
      line.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) || // Date pattern
      line.match(/^\d{1,2}:\d{2}/) // Time pattern
    ) {
      continue;
    }

    // Try to extract price from line
    const priceMatch = line.match(pricePattern);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0 || price > 100000) continue; // Sanity check

    // Extract quantity (usually at the start)
    const qtyMatch = line.match(quantityPattern);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // Extract product name (everything before the price, minus quantity)
    let productName = line;
    
    // Remove quantity if present
    if (qtyMatch) {
      productName = productName.replace(quantityPattern, '');
    }
    
    // Remove price and currency symbols
    productName = productName.replace(pricePattern, '').trim();
    productName = productName.replace(/[\$€£¥]/g, '').trim();
    
    // Remove common suffixes
    productName = productName.replace(/\s+\d+\.\d{2}$/, '').trim(); // Remove trailing price
    
    // Skip if name is too short or looks like a price
    if (productName.length < 2 || /^\d+\.?\d*$/.test(productName)) {
      continue;
    }

    // Skip if it's just numbers or special characters
    if (!/[a-zA-Z]/.test(productName)) {
      continue;
    }

    items.push({
      name: productName,
      quantity: quantity,
      price: price,
      product_id: null, // Will be matched on frontend
      matched: false,
    });
  }

  // Remove duplicates (same name and price)
  const uniqueItems = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.name.toLowerCase()}_${item.price}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

export default router;

