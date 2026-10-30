const mongoose = require('mongoose');

const agendaItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // minutes
  presenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  order: { type: Number, default: 0 },
}, { _id: true });

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['organizer', 'required', 'optional'], default: 'required' },
  attended: { type: Boolean, default: false },
  joinedAt: { type: Date },
}, { _id: true });

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Meeting title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  objective: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  dateTime: {
    type: Date,
    required: [true, 'Meeting date/time is required'],
  },
  endTime: {
    type: Date,
  },
  location: {
    type: String,
    default: '',
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [participantSchema],
  agenda: [agendaItemSchema],
  notes: {
    type: String,
    default: '',
  },
  rawTranscript: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'in-progress', 'completed', 'archived'],
    default: 'draft',
  },
  // AI-generated content
  aiRecap: {
    executiveSummary: { type: String, default: '' },
    detailedSummary: { type: String, default: '' },
    keyDiscussionPoints: [{ type: String }],
    risksAndBlockers: [{ type: String }],
    unresolvedQuestions: [{ type: String }],
    generatedAt: { type: Date },
    model: { type: String, default: '' },
  },
  // Context completeness score
  contextScore: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    missingItems: [{ type: String }],
    recommendations: [{ type: String }],
    calculatedAt: { type: Date },
  },
  tags: [{ type: String, trim: true }],
  relatedMeetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }],
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for decisions linked to this meeting
meetingSchema.virtual('decisions', {
  ref: 'Decision',
  localField: '_id',
  foreignField: 'source.sourceId',
  match: { 'source.sourceType': 'meeting' },
});

// Virtual for action items linked to this meeting
meetingSchema.virtual('actionItems', {
  ref: 'ActionItem',
  localField: '_id',
  foreignField: 'contextLinks.sourceId',
});

meetingSchema.index({ organizer: 1 });
meetingSchema.index({ dateTime: -1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ 'participants.user': 1 });
meetingSchema.index({ title: 'text', description: 'text', notes: 'text' });

module.exports = mongoose.model('Meeting', meetingSchema);
