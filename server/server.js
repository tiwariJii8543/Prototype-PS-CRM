require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const {
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
} = require('./lib/config');
const {
  helmetMiddleware,
  authRateLimiter,
  complaintWriteRateLimiter,
  supportRateLimiter
} = require('./lib/security');
const {
  isNonEmptyString,
  isValidMobile,
  isValidUsername,
  isSafeUrl,
  isValidCoordinate,
  rejectValidation
} = require('./lib/validators');
const {
  parseJsonSafe,
  toMysqlDateTime,
  classifyComplaint,
  createSla,
  createVerification,
  canTransitionStatus,
  createAuditHash,
  createUploadUrl,
  getLatestProofValue,
  toPublicComplaint
} = require('./lib/domain');
const {
  notifyComplaintSubmitted,
  notifyComplaintStatusChanged,
  notifyEscalation,
  notifyDeadlineApproaching,
  notifyDepartmentResponse
} = require('./lib/notifications');

const app = express();
app.use(helmetMiddleware);
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
}));
app.use(bodyParser.json({ limit: '25mb' }));

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

app.use('/uploads', express.static(UPLOAD_ROOT));

const frontendAssets = ['css', 'js'];
frontendAssets.forEach(assetDir => {
  const assetPath = path.join(FRONTEND_ROOT, assetDir);
  if (fs.existsSync(assetPath)) {
    app.use(`/${assetDir}`, express.static(assetPath));
  }
});

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const safeExtension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
  }
});

const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

function shouldUseSslForDatabase() {
  return process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true';
}

function getDatabaseConnectionConfig({ includeDatabase = true } = {}) {
  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const databaseName = databaseUrl.pathname.replace(/^\//, '');
    const config = {
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || 3306),
      user: decodeURIComponent(databaseUrl.username || ''),
      password: decodeURIComponent(databaseUrl.password || '')
    };

    if (includeDatabase && databaseName) {
      config.database = databaseName;
    }

    if (shouldUseSslForDatabase()) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ...(includeDatabase ? { database: DB_NAME } : {})
  };
}

async function initializeDb() {
  const usingDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const conn = await mysql.createConnection(getDatabaseConnectionConfig({ includeDatabase: usingDatabaseUrl }));

  try {
    if (!usingDatabaseUrl) {
      await conn.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await conn.query(`USE ${DB_NAME}`);
    }
    const ensureColumn = async (table, column, definition) => {
      const [rows] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    };

    const ensureColumnType = async (table, column, expectedType, definition) => {
      const [rows] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
      if (rows.length === 0) return;

      const currentType = String(rows[0].Type || '').toLowerCase();
      if (currentType !== expectedType.toLowerCase()) {
        await conn.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${definition}`);
      }
    };

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin','department','citizen') NOT NULL,
        department VARCHAR(100),
        mobile VARCHAR(50),
        preferredLanguage VARCHAR(20) DEFAULT 'en',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        categories JSON,
        head VARCHAR(255)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaintId VARCHAR(100) UNIQUE NOT NULL,
        citizenUserId VARCHAR(100),
        fullName VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        category VARCHAR(100) NOT NULL,
        aiCategory VARCHAR(100),
        priority VARCHAR(50) NOT NULL,
        aiPriority VARCHAR(50),
        status VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        assignedDepartment VARCHAR(100),
        locationAddress VARCHAR(511),
        latitude DOUBLE,
        longitude DOUBLE,
        supportCount INT DEFAULT 0,
        responseText TEXT,
        responseCount INT DEFAULT 0,
        escalationCount INT DEFAULT 0,
        delayCount INT DEFAULT 0,
        proofs JSON,
        timeline JSON,
        verification JSON,
        sla JSON,
        latestProof LONGTEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        closedAt DATETIME NULL
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_chain (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaintId VARCHAR(100) NOT NULL,
        actor JSON NOT NULL,
        action VARCHAR(100) NOT NULL,
        payload JSON,
        previousHash VARCHAR(255),
        currentHash VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaint_proofs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaintId VARCHAR(100) NOT NULL,
        proofUid VARCHAR(150) NOT NULL,
        type VARCHAR(100) NOT NULL,
        url LONGTEXT NOT NULL,
        mimeType VARCHAR(150),
        uploadedBy JSON,
        uploadedAt DATETIME NOT NULL,
        legacyKey VARCHAR(150) NULL UNIQUE,
        INDEX idx_complaint_proofs_complaintId (complaintId),
        INDEX idx_complaint_proofs_uploadedAt (uploadedAt)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaint_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaintId VARCHAR(100) NOT NULL,
        action VARCHAR(150) NOT NULL,
        status VARCHAR(100) NOT NULL,
        description TEXT,
        actor JSON,
        createdAt DATETIME NOT NULL,
        legacyKey VARCHAR(150) NULL UNIQUE,
        INDEX idx_complaint_updates_complaintId (complaintId),
        INDEX idx_complaint_updates_createdAt (createdAt)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaint_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaintId VARCHAR(100) NOT NULL,
        status VARCHAR(100) NOT NULL,
        decision VARCHAR(100),
        remarks TEXT,
        verifiedBy JSON,
        verifiedAt DATETIME NULL,
        createdAt DATETIME NOT NULL,
        legacyKey VARCHAR(150) NULL UNIQUE,
        INDEX idx_complaint_verifications_complaintId (complaintId),
        INDEX idx_complaint_verifications_createdAt (createdAt)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaint_supports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaintId VARCHAR(100) NOT NULL,
        userId VARCHAR(100) NOT NULL,
        createdAt DATETIME NOT NULL,
        UNIQUE KEY uniq_complaint_support (complaintId, userId),
        INDEX idx_complaint_supports_complaintId (complaintId)
      ) ENGINE=InnoDB;
    `);

    await ensureColumn('users', 'preferredLanguage', `VARCHAR(20) DEFAULT 'en'`);
    await ensureColumn('complaints', 'citizenUserId', 'VARCHAR(100)');
    await ensureColumn('complaints', 'title', 'VARCHAR(255)');
    await ensureColumn('complaints', 'aiCategory', 'VARCHAR(100)');
    await ensureColumn('complaints', 'aiPriority', 'VARCHAR(50)');
    await ensureColumn('complaints', 'locationAddress', 'VARCHAR(511)');
    await ensureColumn('complaints', 'responseText', 'TEXT');
    await ensureColumn('complaints', 'responseCount', 'INT DEFAULT 0');
    await ensureColumn('complaints', 'escalationCount', 'INT DEFAULT 0');
    await ensureColumn('complaints', 'delayCount', 'INT DEFAULT 0');
    await ensureColumn('complaints', 'proofs', 'JSON');
    await ensureColumn('complaints', 'timeline', 'JSON');
    await ensureColumn('complaints', 'verification', 'JSON');
    await ensureColumn('complaints', 'sla', 'JSON');
    await ensureColumn('complaints', 'latestProof', 'TEXT');
    await ensureColumn('complaints', 'closedAt', 'DATETIME NULL');
    await ensureColumnType('complaints', 'latestProof', 'longtext', 'LONGTEXT NULL');
    await conn.query(`UPDATE complaints SET locationAddress = location_address WHERE locationAddress IS NULL AND location_address IS NOT NULL`);

    const [existingComplaints] = await conn.query('SELECT complaintId, proofs, timeline, verification FROM complaints');
    for (const complaint of existingComplaints) {
      const proofs = parseJsonSafe(complaint.proofs, []);
      const timeline = parseJsonSafe(complaint.timeline, []);
      const verification = createVerification(parseJsonSafe(complaint.verification, {}));

      for (let index = 0; index < proofs.length; index += 1) {
        const proof = proofs[index];
        await conn.query(
          `INSERT INTO complaint_proofs (complaintId, proofUid, type, url, mimeType, uploadedBy, uploadedAt, legacyKey)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE legacyKey = legacyKey`,
          [
            complaint.complaintId,
            proof.id || `legacy-proof-${complaint.complaintId}-${index}`,
            proof.type || 'resolution',
            proof.url || '',
            proof.mimeType || 'image/jpeg',
            JSON.stringify(proof.uploadedBy || {}),
            toMysqlDateTime(proof.uploadedAt || new Date()),
            `proof:${complaint.complaintId}:${index}`
          ]
        );
      }

      for (let index = 0; index < timeline.length; index += 1) {
        const entry = timeline[index];
        await conn.query(
          `INSERT INTO complaint_updates (complaintId, action, status, description, actor, createdAt, legacyKey)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE legacyKey = legacyKey`,
          [
            complaint.complaintId,
            entry.action || 'Complaint Update',
            entry.status || 'Assigned',
            entry.description || '',
            JSON.stringify(entry.actor || {}),
            toMysqlDateTime(entry.timestamp || new Date()),
            `update:${complaint.complaintId}:${index}`
          ]
        );
      }

      if (verification.decision || verification.status !== 'pending' || verification.remarks || verification.verifiedAt) {
        await conn.query(
          `INSERT INTO complaint_verifications (complaintId, status, decision, remarks, verifiedBy, verifiedAt, createdAt, legacyKey)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE legacyKey = legacyKey`,
          [
            complaint.complaintId,
            verification.status || 'pending',
            verification.decision || null,
            verification.remarks || '',
            JSON.stringify(verification.verifiedBy || {}),
            verification.verifiedAt ? toMysqlDateTime(verification.verifiedAt) : null,
            toMysqlDateTime(verification.verifiedAt || new Date()),
            `verification:${complaint.complaintId}`
          ]
        );
      }
    }

    await conn.query('UPDATE complaints SET proofs = NULL, timeline = NULL, verification = NULL WHERE complaintId IS NOT NULL');

    const [users] = await conn.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      const passwords = await Promise.all([
        bcrypt.hash('admin123', 10),
        bcrypt.hash('road123', 10),
        bcrypt.hash('water123', 10),
        bcrypt.hash('electric123', 10),
        bcrypt.hash('sanitation123', 10)
      ]);

      await conn.query(`
        INSERT INTO users (username, password, name, role, department) VALUES
        ('admin', ?, 'System Administrator', 'admin', NULL),
        ('roads', ?, 'Road Department Officer', 'department', 'dept_road'),
        ('water', ?, 'Water Department Officer', 'department', 'dept_water'),
        ('electric', ?, 'Electricity Department Officer', 'department', 'dept_electric'),
        ('sanitation', ?, 'Sanitation Department Officer', 'department', 'dept_sanitation')
      `, passwords);
    }

    const [departments] = await conn.query('SELECT id FROM departments LIMIT 1');
    if (departments.length === 0) {
      await conn.query(`
        INSERT INTO departments (id, name, categories, head) VALUES
        ('dept_road', 'Roads & Infrastructure', JSON_ARRAY('Road', 'Traffic'), 'Mr. Sharma'),
        ('dept_water', 'Water Supply', JSON_ARRAY('Water'), 'Mrs. Patel'),
        ('dept_electric', 'Electricity', JSON_ARRAY('Electricity'), 'Mr. Kumar'),
        ('dept_sanitation', 'Sanitation', JSON_ARRAY('Sanitation'), 'Ms. Singh'),
        ('dept_parks', 'Parks & Recreation', JSON_ARRAY('Parks'), 'Mr. Gupta'),
        ('dept_noise', 'Noise Control', JSON_ARRAY('Noise'), 'Mrs. Reddy'),
        ('dept_admin', 'General Administration', JSON_ARRAY('Other'), 'Admin Head')
      `);
    }
  } finally {
    await conn.end();
  }
}

(async () => {
  await initializeDb();

  const pool = mysql.createPool({
    ...getDatabaseConnectionConfig({ includeDatabase: true }),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  async function loadComplaintRelations(complaintIds = []) {
    if (complaintIds.length === 0) {
      return { proofsByComplaintId: new Map(), updatesByComplaintId: new Map(), verificationsByComplaintId: new Map() };
    }

    const [proofRows] = await pool.query(
      'SELECT * FROM complaint_proofs WHERE complaintId IN (?) ORDER BY uploadedAt ASC, id ASC',
      [complaintIds]
    );
    const [updateRows] = await pool.query(
      'SELECT * FROM complaint_updates WHERE complaintId IN (?) ORDER BY createdAt ASC, id ASC',
      [complaintIds]
    );
    const [verificationRows] = await pool.query(
      'SELECT * FROM complaint_verifications WHERE complaintId IN (?) ORDER BY createdAt DESC, id DESC',
      [complaintIds]
    );

    const proofsByComplaintId = new Map();
    const updatesByComplaintId = new Map();
    const verificationsByComplaintId = new Map();

    proofRows.forEach(row => {
      if (!proofsByComplaintId.has(row.complaintId)) proofsByComplaintId.set(row.complaintId, []);
      proofsByComplaintId.get(row.complaintId).push({
        id: row.proofUid,
        type: row.type,
        url: row.url,
        mimeType: row.mimeType || 'image/jpeg',
        uploadedAt: new Date(row.uploadedAt).toISOString(),
        uploadedBy: parseJsonSafe(row.uploadedBy, {})
      });
    });

    updateRows.forEach(row => {
      if (!updatesByComplaintId.has(row.complaintId)) updatesByComplaintId.set(row.complaintId, []);
      updatesByComplaintId.get(row.complaintId).push({
        action: row.action,
        status: row.status,
        timestamp: new Date(row.createdAt).toISOString(),
        description: row.description || '',
        actor: parseJsonSafe(row.actor, {})
      });
    });

    verificationRows.forEach(row => {
      if (verificationsByComplaintId.has(row.complaintId)) return;
      verificationsByComplaintId.set(row.complaintId, createVerification({
        status: row.status,
        decision: row.decision,
        remarks: row.remarks || '',
        verifiedAt: row.verifiedAt ? new Date(row.verifiedAt).toISOString() : null,
        verifiedBy: parseJsonSafe(row.verifiedBy, {})
      }));
    });

    return { proofsByComplaintId, updatesByComplaintId, verificationsByComplaintId };
  }

  function normalizeComplaint(row, relations = {}) {
    if (!row) return null;
    const proofs = relations.proofsByComplaintId?.get(row.complaintId) || [];
    const timeline = relations.updatesByComplaintId?.get(row.complaintId) || [];
    const verification = relations.verificationsByComplaintId?.get(row.complaintId) || createVerification();
    return {
      id: row.id,
      complaintId: row.complaintId,
      citizenUserId: row.citizenUserId,
      fullName: row.fullName,
      mobile: row.mobile,
      title: row.title || row.category,
      category: row.category,
      aiCategory: row.aiCategory || row.category,
      priority: row.priority,
      aiPriority: row.aiPriority || row.priority,
      status: row.status,
      description: row.description,
      assignedDepartment: row.assignedDepartment,
      location: {
        address: row.location_address || '',
        lat: row.latitude || 0,
        lng: row.longitude || 0
      },
      supportCount: row.supportCount || 0,
      response: row.responseText || '',
      responseCount: row.responseCount || 0,
      escalationCount: row.escalationCount || 0,
      delayCount: row.delayCount || 0,
      proofs,
      timeline,
      verification,
      sla: createSla(row.priority, row.createdAt, parseJsonSafe(row.sla, {}), SLA_RULES),
      latestProof: row.latestProof || getLatestProofValue(proofs, null),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : null
    };
  }

  async function hydrateComplaints(rows = []) {
    if (!rows.length) return [];
    const complaintIds = rows.map(row => row.complaintId);
    const relations = await loadComplaintRelations(complaintIds);
    return rows.map(row => normalizeComplaint(row, relations));
  }

  async function insertComplaintUpdate(complaintId, entry) {
    await pool.query(
      'INSERT INTO complaint_updates (complaintId, action, status, description, actor, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [
        complaintId,
        entry.action || 'Complaint Update',
        entry.status || 'Assigned',
        entry.description || '',
        JSON.stringify(entry.actor || {}),
        toMysqlDateTime(entry.timestamp || new Date())
      ]
    );
  }

  async function insertComplaintProof(complaintId, proof) {
    await pool.query(
      'INSERT INTO complaint_proofs (complaintId, proofUid, type, url, mimeType, uploadedBy, uploadedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        complaintId,
        proof.id || `proof-${Date.now()}`,
        proof.type || 'resolution',
        proof.url,
        proof.mimeType || 'image/jpeg',
        JSON.stringify(proof.uploadedBy || {}),
        toMysqlDateTime(proof.uploadedAt || new Date())
      ]
    );
  }

  async function insertComplaintVerification(complaintId, verification) {
    await pool.query(
      'INSERT INTO complaint_verifications (complaintId, status, decision, remarks, verifiedBy, verifiedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        complaintId,
        verification.status || 'pending',
        verification.decision || null,
        verification.remarks || '',
        JSON.stringify(verification.verifiedBy || {}),
        verification.verifiedAt ? toMysqlDateTime(verification.verifiedAt) : null,
        toMysqlDateTime(verification.verifiedAt || new Date())
      ]
    );
  }

  async function getComplaintByComplaintId(complaintId) {
    const [rows] = await pool.query('SELECT * FROM complaints WHERE complaintId = ?', [complaintId]);
    if (!rows[0]) return null;
    const complaints = await hydrateComplaints(rows);
    return complaints[0] || null;
  }

  async function appendAudit(complaintId, actor, action, payload) {
    const [rows] = await pool.query('SELECT currentHash FROM audit_chain WHERE complaintId = ? ORDER BY id DESC LIMIT 1', [complaintId]);
    const previousHash = rows[0]?.currentHash || 'GENESIS';
    const currentHash = createAuditHash({ complaintId, actor, action, payload, previousHash, timestamp: new Date().toISOString() });
    await pool.query(
      'INSERT INTO audit_chain (complaintId, actor, action, payload, previousHash, currentHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [complaintId, JSON.stringify(actor || {}), action, JSON.stringify(payload || {}), previousHash, currentHash, toMysqlDateTime(new Date())]
    );
  }

  function authGuard(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

  function requireRoles(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    };
  }

  app.post('/api/uploads', authGuard, complaintWriteRateLimiter, (req, res) => {
    uploadMiddleware.single('file')(req, res, async error => {
      if (error) {
        return res.status(400).json({ message: error.message || 'Upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      res.status(201).json({
        url: createUploadUrl(req, req.file.filename),
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size
      });
    });
  });

  app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!isValidUsername(username) || !isNonEmptyString(password, 6, 100)) {
        return rejectValidation(res, 'Enter a valid username and password');
      }
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const normalizedUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        mobile: user.mobile,
        preferredLanguage: user.preferredLanguage || 'en'
      };
      const token = jwt.sign(normalizedUser, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, user: normalizedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/signup', authRateLimiter, async (req, res) => {
    try {
      const { name, mobile, username, password, preferredLanguage } = req.body;
      if (!isNonEmptyString(name, 2, 100)) {
        return rejectValidation(res, 'Enter a valid name');
      }
      if (!isValidMobile(mobile)) {
        return rejectValidation(res, 'Enter a valid 10-digit mobile number');
      }
      if (!isValidUsername(username)) {
        return rejectValidation(res, 'Username must be 4-30 characters and use only letters, numbers, and underscores');
      }
      if (!isNonEmptyString(password, 6, 100)) {
        return rejectValidation(res, 'Password must be at least 6 characters');
      }
      if (preferredLanguage && !ALLOWED_LANGUAGES.includes(preferredLanguage)) {
        return rejectValidation(res, 'Unsupported language');
      }
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length > 0) return res.status(400).json({ message: 'Username exists' });
      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (username, password, name, role, mobile, preferredLanguage) VALUES (?, ?, ?, ?, ?, ?)',
        [username, passwordHash, name, 'citizen', mobile, preferredLanguage || 'en']
      );
      const user = { id: result.insertId, username, name, role: 'citizen', mobile, preferredLanguage: preferredLanguage || 'en' };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
      res.status(201).json({ token, user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/auth/me', authGuard, (req, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/public/complaints', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM complaints ORDER BY createdAt DESC');
      const complaints = await hydrateComplaints(rows);
      res.json(complaints.map(toPublicComplaint));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/public/complaints/:complaintId', async (req, res) => {
    try {
      const complaint = await getComplaintByComplaintId(req.params.complaintId);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      res.json(toPublicComplaint(complaint));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/public/audit/:complaintId', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM audit_chain WHERE complaintId = ? ORDER BY id ASC', [req.params.complaintId]);
      res.json(rows.map((row, index) => ({
        index,
        complaintId: row.complaintId,
        action: row.action,
        timestamp: new Date(row.createdAt).toISOString(),
        previousHash: row.previousHash || 'GENESIS',
        hash: row.currentHash
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/public/heatmap', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT complaintId, category, priority, status, locationAddress, latitude, longitude, supportCount FROM complaints');
      res.json(rows.map(row => ({
        complaintId: row.complaintId,
        category: row.category,
        priority: row.priority,
        status: row.status,
        address: row.locationAddress,
        lat: row.latitude || 0,
        lng: row.longitude || 0,
        weight: Math.max(1, row.supportCount || 1)
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/complaints', authGuard, complaintWriteRateLimiter, async (req, res) => {
    try {
      const { complaintId, fullName, mobile, category, description, location, evidence } = req.body;
      if (!isNonEmptyString(complaintId, 6, 100)) {
        return rejectValidation(res, 'Complaint ID is required');
      }
      if (!isNonEmptyString(fullName, 2, 100)) {
        return rejectValidation(res, 'Enter a valid citizen name');
      }
      if (!isValidMobile(mobile)) {
        return rejectValidation(res, 'Enter a valid 10-digit mobile number');
      }
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return rejectValidation(res, 'Select a valid complaint category');
      }
      if (!isNonEmptyString(description, 10, 1500)) {
        return rejectValidation(res, 'Complaint description must be between 10 and 1500 characters');
      }
      if (!location || !isNonEmptyString(location.address, 3, 255)) {
        return rejectValidation(res, 'A valid location address is required');
      }
      if (!isValidCoordinate(Number(location.lat), -90, 90) || !isValidCoordinate(Number(location.lng), -180, 180)) {
        return rejectValidation(res, 'Valid GPS coordinates are required');
      }
      if (evidence && !isSafeUrl(evidence)) {
        return rejectValidation(res, 'Evidence must be an uploaded file URL');
      }

      const createdAt = new Date().toISOString();
      const ai = classifyComplaint(category, description, DEFAULT_PRIORITY_RULES);
      const priority = ai.aiPriority || DEFAULT_PRIORITY_RULES[category] || 'Low';
      const assignedDepartment = CATEGORY_DEPARTMENT_MAP[ai.aiCategory] || CATEGORY_DEPARTMENT_MAP[category] || 'dept_admin';
      const proofs = evidence ? [{
        id: `proof-${Date.now()}`,
        type: 'citizen_evidence',
        url: evidence,
        mimeType: 'image/jpeg',
        uploadedAt: createdAt,
        uploadedBy: { id: req.user.id, name: req.user.name, role: req.user.role }
      }] : [];
      const timeline = [
        {
          action: 'Complaint Submitted',
          status: 'Submitted',
          timestamp: createdAt,
          description: 'Complaint submitted by citizen and registered in the system.',
          actor: { id: req.user.id, name: req.user.name, role: req.user.role }
        },
        {
          action: 'AI Classification',
          status: 'Assigned',
          timestamp: createdAt,
          description: `Complaint categorized as ${ai.aiCategory} with ${priority} priority and routed automatically.`,
          actor: { id: 'system', name: 'PS-CRM AI Router', role: 'system' }
        }
      ];
      const verification = createVerification();
      const sla = createSla(priority, createdAt, {}, SLA_RULES);

      await pool.query(
        `INSERT INTO complaints (
          complaintId, citizenUserId, fullName, mobile, title, category, aiCategory, priority, aiPriority, status,
          description, assignedDepartment, locationAddress, latitude, longitude, supportCount, responseText,
          responseCount, escalationCount, delayCount, proofs, timeline, verification, sla, latestProof
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          complaintId,
          String(req.user.id),
          fullName,
          mobile,
          category,
          category,
          ai.aiCategory,
          priority,
          ai.aiPriority,
          'Assigned',
          description,
          assignedDepartment,
          location?.address || '',
          location?.lat || 0,
          location?.lng || 0,
          0,
          '',
          0,
          0,
          0,
          null,
          null,
          null,
          JSON.stringify(sla),
          getLatestProofValue(proofs, null)
        ]
      );

      for (const proof of proofs) {
        await insertComplaintProof(complaintId, proof);
      }
      for (const entry of timeline) {
        await insertComplaintUpdate(complaintId, entry);
      }

      await appendAudit(complaintId, req.user, 'COMPLAINT_SUBMITTED', { category, priority, assignedDepartment });
      res.status(201).json(await getComplaintByComplaintId(complaintId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/complaints', authGuard, async (req, res) => {
    try {
      let query = 'SELECT * FROM complaints ORDER BY createdAt DESC';
      let params = [];
      if (req.user.role === 'department') {
        query = 'SELECT * FROM complaints WHERE assignedDepartment = ? ORDER BY createdAt DESC';
        params = [req.user.department];
      } else if (req.user.role === 'citizen') {
        query = 'SELECT * FROM complaints WHERE citizenUserId = ? ORDER BY createdAt DESC';
        params = [String(req.user.id)];
      }
      const [rows] = await pool.query(query, params);
      res.json(await hydrateComplaints(rows));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/complaints/:complaintId', authGuard, async (req, res) => {
    try {
      const complaint = await getComplaintByComplaintId(req.params.complaintId);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      res.json(complaint);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/complaints/:complaintId/support', authGuard, requireRoles('citizen'), supportRateLimiter, async (req, res) => {
    try {
      const complaint = await getComplaintByComplaintId(req.params.complaintId);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      const [existing] = await pool.query('SELECT id FROM complaint_supports WHERE complaintId = ? AND userId = ?', [complaint.complaintId, String(req.user.id)]);
      if (existing.length > 0) {
        return res.status(409).json({ message: 'You have already supported this complaint' });
      }
      const timelineEntry = {
        action: 'Community Support Added',
        status: complaint.status,
        timestamp: new Date().toISOString(),
        description: 'A citizen supported this complaint to increase its priority visibility.',
        actor: { id: req.user.id, name: req.user.name, role: req.user.role }
      };
      await pool.query('INSERT INTO complaint_supports (complaintId, userId, createdAt) VALUES (?, ?, ?)', [complaint.complaintId, String(req.user.id), toMysqlDateTime(new Date())]);
      await pool.query('UPDATE complaints SET supportCount = ? WHERE complaintId = ?', [complaint.supportCount + 1, complaint.complaintId]);
      await insertComplaintUpdate(complaint.complaintId, timelineEntry);
      await appendAudit(complaint.complaintId, { id: req.user.id, name: req.user.name, role: req.user.role }, 'COMPLAINT_SUPPORTED', { supportCount: complaint.supportCount + 1 });
      res.json(await getComplaintByComplaintId(complaint.complaintId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/complaints/:complaintId/status', authGuard, requireRoles('department', 'admin'), complaintWriteRateLimiter, async (req, res) => {
    try {
      const complaint = await getComplaintByComplaintId(req.params.complaintId);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (req.user.role === 'department' && complaint.assignedDepartment !== req.user.department) {
        return res.status(403).json({ message: 'You can only work on complaints assigned to your department' });
      }

      const { status, response, estimatedDays, proof } = req.body;
      if (!ALLOWED_STATUS_UPDATES.includes(status)) {
        return rejectValidation(res, 'Select a valid status update');
      }
      if (response && !isNonEmptyString(response, 3, 1500)) {
        return rejectValidation(res, 'Response must be between 3 and 1500 characters');
      }
      if (estimatedDays !== undefined && estimatedDays !== null && estimatedDays !== '' && (!Number.isInteger(Number(estimatedDays)) || Number(estimatedDays) < 1 || Number(estimatedDays) > 30)) {
        return rejectValidation(res, 'Estimated resolution days must be between 1 and 30');
      }
      if (proof) {
        if (!isSafeUrl(proof.url || '')) {
          return rejectValidation(res, 'Proof must be an uploaded image URL');
        }
        if (!isNonEmptyString(proof.type || 'resolution', 3, 50)) {
          return rejectValidation(res, 'Proof type is invalid');
        }
      }
      if (!canTransitionStatus(complaint.status, status)) {
        return res.status(400).json({ message: `Cannot move complaint from ${complaint.status} to ${status}` });
      }

      let latestProofUrl = complaint.latestProof;
      let proofCount = complaint.proofs.length;
      if (proof?.url) {
        const proofRecord = {
          id: proof.id || `proof-${Date.now()}`,
          type: proof.type || 'resolution',
          url: proof.url,
          mimeType: proof.mimeType || 'image/jpeg',
          uploadedAt: new Date().toISOString(),
          uploadedBy: { id: req.user.id, name: req.user.name, role: req.user.role }
        };
        await insertComplaintProof(complaint.complaintId, proofRecord);
        latestProofUrl = getLatestProofValue([proofRecord], complaint.latestProof);
        proofCount += 1;
      }
      if (status === 'Awaiting Citizen Verification' && proofCount === 0) {
        return res.status(400).json({ message: 'Proof is required before requesting citizen verification' });
      }

      const timelineEntry = {
        action: 'Department Response',
        status,
        timestamp: new Date().toISOString(),
        description: response || `Complaint status updated to ${status}.`,
        actor: { id: req.user.id, name: req.user.name, role: req.user.role }
      };
      await insertComplaintUpdate(complaint.complaintId, timelineEntry);
      const sla = {
        ...complaint.sla,
        resolutionDeadline: estimatedDays ? new Date(Date.now() + Number(estimatedDays) * 24 * 60 * 60 * 1000).toISOString() : complaint.sla.resolutionDeadline
      };

      await pool.query(
        'UPDATE complaints SET status = ?, responseText = ?, responseCount = ?, sla = ?, latestProof = ? WHERE complaintId = ?',
        [
          status,
          response || complaint.response,
          complaint.responseCount + (response ? 1 : 0),
          JSON.stringify(sla),
          latestProofUrl,
          complaint.complaintId
        ]
      );
      await appendAudit(complaint.complaintId, req.user, 'STATUS_UPDATED', { from: complaint.status, to: status, response: response || '', proofAdded: Boolean(proof?.url) });
      res.json(await getComplaintByComplaintId(complaint.complaintId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/complaints/:complaintId/verify', authGuard, requireRoles('citizen', 'admin'), complaintWriteRateLimiter, async (req, res) => {
    try {
      const complaint = await getComplaintByComplaintId(req.params.complaintId);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      const { decision, remarks } = req.body;
      if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Invalid verification decision' });
      if (remarks && !isNonEmptyString(remarks, 3, 1000)) {
        return rejectValidation(res, 'Remarks must be between 3 and 1000 characters');
      }
      if (!['Awaiting Citizen Verification', 'Escalated'].includes(complaint.status)) {
        return res.status(400).json({ message: 'Complaint is not awaiting verification' });
      }

      const nextStatus = decision === 'accepted' ? 'Closed' : 'Reopened';
      const verification = createVerification({
        status: decision,
        decision,
        remarks: remarks || '',
        verifiedAt: new Date().toISOString(),
        verifiedBy: { id: req.user.id, name: req.user.name, role: req.user.role }
      });
      const timelineEntry = {
        action: decision === 'accepted' ? 'Resolution Accepted' : 'Resolution Rejected',
        status: nextStatus,
        timestamp: new Date().toISOString(),
        description: remarks || (decision === 'accepted' ? 'Citizen accepted the resolution.' : 'Citizen rejected the resolution and reopened the complaint.'),
        actor: { id: req.user.id, name: req.user.name, role: req.user.role }
      };
      await insertComplaintVerification(complaint.complaintId, verification);
      await insertComplaintUpdate(complaint.complaintId, timelineEntry);

      await pool.query('UPDATE complaints SET status = ?, closedAt = ? WHERE complaintId = ?', [nextStatus, nextStatus === 'Closed' ? toMysqlDateTime(new Date()) : null, complaint.complaintId]);
      await appendAudit(complaint.complaintId, req.user, 'CITIZEN_VERIFIED', { decision, remarks: remarks || '' });
      res.json(await getComplaintByComplaintId(complaint.complaintId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/complaints/:complaintId/escalate', authGuard, requireRoles('admin'), complaintWriteRateLimiter, async (req, res) => {
    try {
      const complaint = await getComplaintByComplaintId(req.params.complaintId);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      const reason = req.body.reason || 'Complaint escalated to senior authority';
      if (!isNonEmptyString(reason, 5, 1000)) {
        return rejectValidation(res, 'Escalation reason must be between 5 and 1000 characters');
      }
      const timelineEntry = {
        action: 'Complaint Escalated',
        status: 'Escalated',
        timestamp: new Date().toISOString(),
        description: reason,
        actor: { id: req.user.id, name: req.user.name, role: req.user.role }
      };
      await insertComplaintUpdate(complaint.complaintId, timelineEntry);
      const sla = { ...complaint.sla, breached: true, lastEscalatedAt: new Date().toISOString() };
      await pool.query('UPDATE complaints SET status = ?, escalationCount = ?, delayCount = ?, sla = ? WHERE complaintId = ?', ['Escalated', complaint.escalationCount + 1, complaint.delayCount + 1, JSON.stringify(sla), complaint.complaintId]);
      await appendAudit(complaint.complaintId, req.user, 'ESCALATED', { reason });
      res.json(await getComplaintByComplaintId(complaint.complaintId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/departments', authGuard, async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.json(rows.map(row => ({ id: row.id, name: row.name, categories: parseJsonSafe(row.categories, []), head: row.head })));
  });

  app.get('/api/audit/:complaintId', authGuard, async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM audit_chain WHERE complaintId = ? ORDER BY id ASC', [req.params.complaintId]);
    res.json(rows.map(row => ({
      id: row.id,
      complaintId: row.complaintId,
      actor: parseJsonSafe(row.actor, {}),
      action: row.action,
      payload: parseJsonSafe(row.payload, {}),
      previousHash: row.previousHash,
      currentHash: row.currentHash,
      timestamp: new Date(row.createdAt).toISOString()
    })));
  });

  app.get('/api/public/stats', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM complaints');
    const complaints = await hydrateComplaints(rows);
    const stats = { total: complaints.length, pending: 0, resolved: 0, delayed: 0, critical: 0, assigned: 0, workStarted: 0, awaitingVerification: 0, escalated: 0, closed: 0, byCategory: {}, byDepartment: {}, priority: {} };
    for (const complaint of complaints) {
      stats.byCategory[complaint.category] = (stats.byCategory[complaint.category] || 0) + 1;
      stats.priority[complaint.priority] = (stats.priority[complaint.priority] || 0) + 1;
      if (complaint.priority === 'Critical') stats.critical += 1;
      if (!stats.byDepartment[complaint.assignedDepartment || 'unassigned']) {
        stats.byDepartment[complaint.assignedDepartment || 'unassigned'] = { total: 0, resolved: 0, pending: 0, delayed: 0 };
      }
      const dept = stats.byDepartment[complaint.assignedDepartment || 'unassigned'];
      dept.total += 1;
      if (complaint.status === 'Assigned') { stats.pending += 1; stats.assigned += 1; dept.pending += 1; }
      if (complaint.status === 'In Progress') { stats.workStarted += 1; dept.pending += 1; }
      if (complaint.status === 'Awaiting Citizen Verification') { stats.awaitingVerification += 1; stats.resolved += 1; }
      if (complaint.status === 'Escalated') { stats.escalated += 1; stats.delayed += 1; dept.delayed += 1; }
      if (complaint.status === 'Closed') { stats.closed += 1; stats.resolved += 1; dept.resolved += 1; }
    }
    res.json(stats);
  });

  app.get('/api/blockchain', authGuard, async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM audit_chain ORDER BY id ASC');
    res.json(rows.map((row, index) => ({ index, timestamp: new Date(row.createdAt).toISOString(), complaintId: row.complaintId, action: row.action, previousHash: row.previousHash || 'GENESIS', hash: row.currentHash, data: parseJsonSafe(row.payload, {}) })));
  });

  app.post('/api/blockchain', authGuard, complaintWriteRateLimiter, async (req, res) => {
    const { complaintId, action, previousHash, hash, data, timestamp } = req.body;
    if (complaintId && !isNonEmptyString(complaintId, 3, 100)) {
      return rejectValidation(res, 'Complaint ID is invalid');
    }
    if (action && !isNonEmptyString(action, 3, 100)) {
      return rejectValidation(res, 'Action is invalid');
    }
    await pool.query('INSERT INTO audit_chain (complaintId, actor, action, payload, previousHash, currentHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [complaintId || 'GENESIS', JSON.stringify(req.user || {}), action || 'BLOCKCHAIN_EVENT', JSON.stringify(data || {}), previousHash || 'GENESIS', hash || createAuditHash(req.body || {}), toMysqlDateTime(timestamp || new Date())]);
    res.status(201).json({ ok: true });
  });

  // Notification endpoints
  app.post('/api/notify/complaint-submitted', authGuard, async (req, res) => {
    try {
      const { complaintId, departmentId } = req.body;
      if (!complaintId || !departmentId) {
        return res.status(400).json({ message: 'Missing complaintId or departmentId' });
      }

      const [complaint] = await pool.query('SELECT * FROM complaints WHERE complaintId = ?', [complaintId]);
      const [department] = await pool.query('SELECT * FROM departments WHERE id = ?', [departmentId]);

      if (complaint[0] && department[0]) {
        await notifyComplaintSubmitted(complaint[0], department[0]);
        res.json({ ok: true, message: 'Notification sent' });
      } else {
        res.status(404).json({ message: 'Complaint or department not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  app.post('/api/notify/status-changed', authGuard, async (req, res) => {
    try {
      const { complaintId, newStatus, userEmail } = req.body;
      if (!complaintId || !newStatus) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const [complaint] = await pool.query('SELECT * FROM complaints WHERE complaintId = ?', [complaintId]);

      if (complaint[0]) {
        await notifyComplaintStatusChanged(complaint[0], newStatus, userEmail);
        res.json({ ok: true, message: 'Status notification sent' });
      } else {
        res.status(404).json({ message: 'Complaint not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  app.post('/api/notify/escalation', authGuard, async (req, res) => {
    try {
      const { complaintId, reason, adminEmail } = req.body;
      if (!complaintId) {
        return res.status(400).json({ message: 'Missing complaintId' });
      }

      const [complaint] = await pool.query('SELECT * FROM complaints WHERE complaintId = ?', [complaintId]);

      if (complaint[0]) {
        await notifyEscalation(complaint[0], reason || 'Escalated for attention', adminEmail);
        res.json({ ok: true, message: 'Escalation notification sent' });
      } else {
        res.status(404).json({ message: 'Complaint not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  app.post('/api/notify/deadline-warning', authGuard, async (req, res) => {
    try {
      const { complaintId, daysLeft, departmentEmail } = req.body;
      if (!complaintId) {
        return res.status(400).json({ message: 'Missing complaintId' });
      }

      const [complaint] = await pool.query('SELECT * FROM complaints WHERE complaintId = ?', [complaintId]);

      if (complaint[0]) {
        await notifyDeadlineApproaching(complaint[0], daysLeft, departmentEmail);
        res.json({ ok: true, message: 'Deadline warning sent' });
      } else {
        res.status(404).json({ message: 'Complaint not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  app.post('/api/notify/department-response', authGuard, async (req, res) => {
    try {
      const { complaintId, response, userEmail } = req.body;
      if (!complaintId || !response) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const [complaint] = await pool.query('SELECT * FROM complaints WHERE complaintId = ?', [complaintId]);

      if (complaint[0]) {
        await notifyDepartmentResponse(complaint[0], response, userEmail);
        res.json({ ok: true, message: 'Response notification sent' });
      } else {
        res.status(404).json({ message: 'Complaint not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT 1 AS ok');
      res.json({
        ok: true,
        database: rows?.[0]?.ok === 1 ? 'connected' : 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        database: 'disconnected',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  if (fs.existsSync(FRONTEND_ENTRY)) {
    app.get('/', (req, res) => {
      res.sendFile(FRONTEND_ENTRY);
    });

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      return res.sendFile(FRONTEND_ENTRY);
    });
  }

  app.listen(PORT, () => {
    console.log(`PS-CRM backend API listening on port ${PORT}`);
  });
})().catch(error => {
  console.error('DB initialization failed', error);
  process.exit(1);
});
