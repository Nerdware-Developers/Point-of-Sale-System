import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { authenticate, authorize } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Preserve original extension and create unique filename
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased)
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

// Upload product image
router.post('/product-image', authenticate, authorize('admin'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        details: 'Please select an image file'
      });
    }

    // Validate file was actually saved
    const filePath = path.join(uploadsDir, req.file.filename);
    
    if (!existsSync(filePath)) {
      return res.status(500).json({ 
        error: 'File upload failed',
        details: 'File was not saved to disk'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      imageUrl, 
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error details:', error.message, error.code);
    
    // Provide more detailed error messages
    let errorMessage = 'Upload failed';
    if (error.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'File size too large. Maximum size is 10MB';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

