function parseJsonSafe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toMysqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

function classifyComplaint(category = '', description = '', defaultPriorityRules = {}) {
  const text = `${category} ${description}`.toLowerCase();
  const rules = [
    { category: 'Electricity', priority: 'Critical', keywords: ['electric', 'power', 'street light', 'transformer'] },
    { category: 'Water', priority: 'High', keywords: ['water', 'leak', 'pipe', 'sewage'] },
    { category: 'Road', priority: 'High', keywords: ['road', 'pothole', 'traffic', 'accident'] },
    { category: 'Sanitation', priority: 'Medium', keywords: ['garbage', 'sanitation', 'waste', 'drain'] },
    { category: 'Noise', priority: 'Medium', keywords: ['noise', 'loud', 'speaker'] },
    { category: 'Parks', priority: 'Low', keywords: ['park', 'tree', 'playground'] }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(keyword => text.includes(keyword))) {
      return { aiCategory: rule.category, aiPriority: rule.priority };
    }
  }

  return {
    aiCategory: category || 'Other',
    aiPriority: defaultPriorityRules[category] || 'Low'
  };
}

function createSla(priority, createdAt, overrides = {}, slaRules = {}) {
  const rule = slaRules[priority] || slaRules.Low;
  const created = new Date(createdAt || Date.now());
  return {
    firstResponseHours: rule.firstResponseHours,
    resolutionHours: rule.resolutionHours,
    responseDeadline: overrides.responseDeadline || new Date(created.getTime() + rule.firstResponseHours * 60 * 60 * 1000).toISOString(),
    resolutionDeadline: overrides.resolutionDeadline || new Date(created.getTime() + rule.resolutionHours * 60 * 60 * 1000).toISOString(),
    breached: Boolean(overrides.breached),
    lastEscalatedAt: overrides.lastEscalatedAt || null
  };
}

function createVerification(overrides = {}) {
  return {
    status: overrides.status || 'pending',
    decision: overrides.decision || null,
    remarks: overrides.remarks || '',
    verifiedAt: overrides.verifiedAt || null,
    verifiedBy: overrides.verifiedBy || null
  };
}

function canTransitionStatus(currentStatus, nextStatus) {
  const transitions = {
    Submitted: ['Assigned', 'Escalated'],
    Assigned: ['In Progress', 'Escalated'],
    'In Progress': ['Awaiting Citizen Verification', 'Escalated'],
    'Awaiting Citizen Verification': ['Closed', 'Reopened', 'Escalated'],
    Reopened: ['In Progress', 'Escalated'],
    Escalated: ['In Progress', 'Awaiting Citizen Verification', 'Closed'],
    Closed: []
  };

  return currentStatus === nextStatus || (transitions[currentStatus] || []).includes(nextStatus);
}

function createAuditHash(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 128);
}

function createUploadUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

function isInlineDataUrl(value = '') {
  return typeof value === 'string' && value.startsWith('data:');
}

function getLatestProofValue(proofs = [], fallback = null) {
  const latestProof = proofs[proofs.length - 1];
  const latestUrl = latestProof?.url || '';

  if (!latestUrl) return fallback || null;
  if (isInlineDataUrl(latestUrl)) {
    return fallback && !isInlineDataUrl(fallback) ? fallback : null;
  }

  return latestUrl;
}

function getPublicLocation(location = {}) {
  const coarseLat = Number.isFinite(Number(location.lat)) ? Number(Number(location.lat).toFixed(2)) : 0;
  const coarseLng = Number.isFinite(Number(location.lng)) ? Number(Number(location.lng).toFixed(2)) : 0;

  return {
    address: coarseLat && coarseLng ? `Approx. area near ${coarseLat}, ${coarseLng}` : 'Approximate location available',
    lat: coarseLat,
    lng: coarseLng
  };
}

function toPublicComplaint(complaint) {
  return {
    complaintId: complaint.complaintId,
    category: complaint.category,
    priority: complaint.priority,
    status: complaint.status,
    assignedDepartment: complaint.assignedDepartment,
    location: getPublicLocation(complaint.location),
    description: complaint.description,
    supportCount: complaint.supportCount,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    timeline: (complaint.timeline || []).map(entry => ({
      action: entry.action,
      status: entry.status,
      timestamp: entry.timestamp,
      description: entry.description
    })),
    sla: complaint.sla
  };
}

module.exports = {
  parseJsonSafe,
  toMysqlDateTime,
  classifyComplaint,
  createSla,
  createVerification,
  canTransitionStatus,
  createAuditHash,
  createUploadUrl,
  isInlineDataUrl,
  getLatestProofValue,
  getPublicLocation,
  toPublicComplaint
};
