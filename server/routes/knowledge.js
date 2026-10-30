const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Meeting = require('../models/Meeting');
const ActionItem = require('../models/ActionItem');
const Decision = require('../models/Decision');
const KnowledgeLink = require('../models/KnowledgeLink');
const upload = require('../config/upload');
const { auth } = require('../middleware/auth');
const { suggestKnowledgeLinks } = require('../services/aiService');
const { logActivity } = require('../services/activityService');
const { logger } = require('../config/logger');

// Helper to extract text from uploaded files where possible
async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType.includes('text') || filePath.endsWith('.txt') || filePath.endsWith('.md') || filePath.endsWith('.json') || filePath.endsWith('.csv')) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    // PDF extraction if pdf-parse is available
    if (mimeType.includes('pdf') || filePath.endsWith('.pdf')) {
      try {
        const pdf = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text || '';
      } catch (pdfErr) {
        logger.warn('PDF parse fallback', { error: pdfErr.message });
      }
    }
  } catch (err) {
    logger.warn('Text extraction fallback', { error: err.message });
  }
  return '';
}

// GET /api/knowledge/documents
router.get('/documents', auth, async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('uploadedBy', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: documents,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/knowledge/documents (Upload)
router.post('/documents', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      logger.warn('Document upload error', { error: err.message, code: err.code });
      return res.status(400).json({
        success: false,
        error: { message: err.message || 'File upload failed', code: err.code || 'UPLOAD_ERROR' }
      });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded', code: 'FILE_REQUIRED' }
      });
    }

    const { title, description, category, tags, accessLevel } = req.body;
    const extractedContent = await extractTextFromFile(req.file.path, req.file.mimetype);

    let parsedTags = [];
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }

    const doc = await Document.create({
      title: title || req.file.originalname,
      description: description || '',
      fileName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      content: extractedContent,
      category: category || 'other',
      tags: parsedTags,
      accessLevel: accessLevel || 'public',
      team: req.user.team || 'General',
    });

    await logActivity({
      userId: req.user._id,
      action: 'upload_document',
      entityType: 'document',
      entityId: doc._id,
      details: { title: doc.title, fileName: doc.fileName },
      correlationId: req.correlationId,
    });

    res.status(201).json({
      success: true,
      data: { document: doc },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/knowledge/documents/:id
router.get('/documents/:id', auth, async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email avatar team title');

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found', code: 'DOCUMENT_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { document: doc },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/knowledge/documents/:id/download
router.get('/documents/:id/download', auth, async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || !fs.existsSync(doc.filePath)) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found on disk', code: 'FILE_NOT_FOUND' }
      });
    }

    res.download(doc.filePath, doc.title || doc.fileName);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/knowledge/documents/:id
router.delete('/documents/:id', auth, async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found', code: 'DOCUMENT_NOT_FOUND' }
      });
    }

    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
    await doc.deleteOne();

    res.json({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/knowledge/search (Unified Organizational Search)
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({
        success: true,
        data: { meetings: [], tasks: [], decisions: [], documents: [] },
      });
    }

    const searchRegex = new RegExp(q, 'i');

    const [meetings, tasks, decisions, documents] = await Promise.all([
      Meeting.find({
        status: { $ne: 'archived' },
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { notes: searchRegex },
          { tags: { $in: [searchRegex] } },
        ],
      })
        .populate('organizer', 'name email')
        .limit(10),

      ActionItem.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } },
        ],
      })
        .populate('assignedTo', 'name email')
        .limit(10),

      Decision.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { rationale: searchRegex },
        ],
      })
        .populate('madeBy', 'name email')
        .limit(10),

      Document.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { content: searchRegex },
          { tags: { $in: [searchRegex] } },
        ],
      })
        .populate('uploadedBy', 'name email')
        .limit(10),
    ]);

    res.json({
      success: true,
      data: {
        query: q,
        meetings,
        tasks,
        decisions,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/knowledge/suggest-links (AI-Powered Knowledge Linking)
router.post('/suggest-links', auth, async (req, res, next) => {
  try {
    const { sourceType, sourceId, title, description } = req.body;

    // Fetch candidate historical items
    const [meetings, documents, decisions] = await Promise.all([
      Meeting.find({ _id: { $ne: sourceId } }).select('title description notes').limit(15),
      Document.find({ _id: { $ne: sourceId } }).select('title description content').limit(15),
      Decision.find({ _id: { $ne: sourceId } }).select('title description rationale').limit(15),
    ]);

    const candidates = [
      ...meetings.map(m => ({ _id: m._id, title: `[Meeting] ${m.title}`, description: m.description, notes: m.notes })),
      ...documents.map(d => ({ _id: d._id, title: `[Doc] ${d.title}`, description: d.description, content: d.content })),
      ...decisions.map(d => ({ _id: d._id, title: `[Decision] ${d.title}`, description: d.description, notes: d.rationale })),
    ];

    const suggestions = await suggestKnowledgeLinks({
      sourceItem: { title, description },
      candidates,
      correlationId: req.correlationId,
      userId: req.user._id,
    });

    res.json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/knowledge/links
router.get('/links', auth, async (req, res, next) => {
  try {
    const { sourceType, sourceId } = req.query;
    const filter = {};
    if (sourceType) filter.sourceType = sourceType;
    if (sourceId) filter.sourceId = sourceId;

    const links = await KnowledgeLink.find(filter)
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email')
      .sort({ relevanceScore: -1 });

    res.json({
      success: true,
      data: { links },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/knowledge/links
router.post('/links', auth, async (req, res, next) => {
  try {
    const { sourceType, sourceId, targetType, targetId, relevanceScore, explanation, aiSuggested } = req.body;
    const link = await KnowledgeLink.create({
      sourceType,
      sourceId,
      targetType,
      targetId,
      relevanceScore: relevanceScore || 0.8,
      explanation: explanation || '',
      aiSuggested: !!aiSuggested,
      confirmed: !aiSuggested,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: { link },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/knowledge/links/:id/confirm
router.patch('/links/:id/confirm', auth, async (req, res, next) => {
  try {
    const link = await KnowledgeLink.findByIdAndUpdate(
      req.params.id,
      {
        confirmed: true,
        confirmedBy: req.user._id,
      },
      { new: true }
    );

    res.json({
      success: true,
      data: { link },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
