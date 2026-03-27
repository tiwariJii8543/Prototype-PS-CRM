const path = require('path');

const PORT = process.env.PORT || 5000;
const DB_NAME = process.env.DB_NAME || 'ps_crm_db';
const JWT_SECRET = process.env.JWT_SECRET || 'ps_crm_dev_secret';
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const FRONTEND_ROOT = path.join(__dirname, '..', '..');
const FRONTEND_ENTRY = path.join(FRONTEND_ROOT, 'index.html');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const CATEGORY_DEPARTMENT_MAP = {
  Road: 'dept_road',
  Traffic: 'dept_road',
  Water: 'dept_water',
  Electricity: 'dept_electric',
  Sanitation: 'dept_sanitation',
  Parks: 'dept_parks',
  Noise: 'dept_noise',
  Other: 'dept_admin'
};

const DEFAULT_PRIORITY_RULES = {
  Road: 'High',
  Traffic: 'High',
  Water: 'High',
  Electricity: 'Critical',
  Sanitation: 'Medium',
  Parks: 'Low',
  Noise: 'Medium',
  Other: 'Low'
};

const SLA_RULES = {
  Critical: { firstResponseHours: 4, resolutionHours: 24 },
  High: { firstResponseHours: 8, resolutionHours: 48 },
  Medium: { firstResponseHours: 12, resolutionHours: 72 },
  Low: { firstResponseHours: 24, resolutionHours: 120 }
};

const ALLOWED_CATEGORIES = Object.keys(CATEGORY_DEPARTMENT_MAP);
const ALLOWED_LANGUAGES = ['en', 'hi', 'bn', 'ta', 'te'];
const ALLOWED_STATUS_UPDATES = ['In Progress', 'Awaiting Citizen Verification', 'Escalated', 'Closed', 'Reopened'];

module.exports = {
  PORT,
  DB_NAME,
  JWT_SECRET,
  UPLOAD_ROOT,
  FRONTEND_ROOT,
  FRONTEND_ENTRY,
  ALLOWED_ORIGINS,
  CATEGORY_DEPARTMENT_MAP,
  DEFAULT_PRIORITY_RULES,
  SLA_RULES,
  ALLOWED_CATEGORIES,
  ALLOWED_LANGUAGES,
  ALLOWED_STATUS_UPDATES
};
