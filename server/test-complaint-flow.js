/**
 * Test complaint submission flow end-to-end
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'ps_crm_dev_secret';

async function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, '')
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ps_crm_db'
  };
}

async function testComplaintFlow() {
  const config = await getDatabaseConfig();
  console.log('🔍 Connecting to database:', { host: config.host, database: config.database });
  
  const conn = await mysql.createConnection(config);
  
  try {
    // 1. Create a test citizen user
    console.log('\n1️⃣ Creating test citizen user...');
    const testUsername = `testcitizen_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'testpass123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const [result] = await conn.query(
      'INSERT INTO users (username, password, name, role, mobile, email) VALUES (?, ?, ?, ?, ?, ?)',
      [testUsername, hashedPassword, 'Test Citizen', 'citizen', '9999999999', testEmail]
    );
    
    const userId = result.insertId;
    console.log(`✅ Created user: ${testUsername} (ID: ${userId})`);
    
    // 2. Generate JWT token for this user
    console.log('\n2️⃣ Generating JWT token...');
    const token = jwt.sign(
      {
        id: userId,
        username: testUsername,
        name: 'Test Citizen',
        role: 'citizen',
        mobile: '9999999999',
        email: testEmail,
        preferredLanguage: 'en'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    console.log(`✅ Token generated: ${token.substring(0, 30)}...`);
    
    // 3. Test GET /api/auth/me with token
    console.log('\n3️⃣ Testing GET /api/auth/me...');
    const meResponse = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!meResponse.ok) {
      console.error(`❌ GET /api/auth/me failed: ${meResponse.status}`);
      const errorBody = await meResponse.text();
      console.error('Response:', errorBody);
    } else {
      const meData = await meResponse.json();
      console.log('✅ GET /api/auth/me succeeded:', meData);
    }
    
    // 4. Submit a test complaint
    console.log('\n4️⃣ Submitting complaint...');
    const complaintPayload = {
      complaintId: `PSR-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      fullName: 'Test Citizen',
      mobile: '9999999999',
      category: 'Road',
      description: 'This is a test complaint to verify the submission flow works correctly.',
      location: {
        address: 'Test Location',
        lat: 12.972442,
        lng: 77.594566
      },
      evidence: ''
    };
    
    console.log('Payload:', JSON.stringify(complaintPayload, null, 2));
    
    const complaintResponse = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(complaintPayload)
    });
    
    console.log(`Response status: ${complaintResponse.status}`);
    
    if (!complaintResponse.ok) {
      console.error(`❌ Complaint submission failed with status ${complaintResponse.status}`);
      const errorBody = await complaintResponse.json();
      console.error('Error response:', JSON.stringify(errorBody, null, 2));
    } else {
      const complaintData = await complaintResponse.json();
      console.log('✅ Complaint submitted successfully!');
      console.log('Complaint ID:', complaintData.complaintId);
      console.log('Status:', complaintData.status);
      console.log('Full response:', JSON.stringify(complaintData, null, 2));
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err);
  } finally {
    await conn.end();
  }
}

testComplaintFlow();
