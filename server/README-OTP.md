PS-CRM OTP / SMTP Setup

This document explains how to configure SMTP and test the signup OTP flow locally.

1) Configure `server/.env`

- Open `server/.env` and set the following values:

  - `SMTP_HOST` (e.g. smtp.gmail.com)
  - `SMTP_PORT` (587 for TLS, 465 for SSL)
  - `SMTP_SECURE` (true for port 465, false for 587)
  - `SMTP_USER` (your SMTP username / email)
  - `SMTP_PASS` (SMTP password or app password)
  - `ENABLE_EMAIL_NOTIFICATIONS=true` to enable sending emails
  - `APP_URL` set to the base URL (e.g. http://localhost:5000)

Important: do NOT commit real credentials to source control. Keep `server/.env` local.

2) Start the backend

```bash
cd server
npm install
npm run dev
```

3) Test signup flow (two options)

A) Using the UI
- Open the app in the browser and perform Sign Up. The backend will send an OTP to the configured email.
- Enter the OTP in the modal to finish account creation.

B) Using curl (example)

```bash
# Step 0: fetch captcha challenge
curl -s http://localhost:5000/api/auth/captcha

# Use the returned token and solve the prompt manually.
# Example response:
# {"token":"abc123","prompt":"8 + 2"}

# Step 1: sign up (returns requiresOtp)
curl -s -X POST http://localhost:5000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","mobile":"9876543210","email":"your-test-email@example.com","username":"testuser","password":"testpass","captchaToken":"abc123","captchaAnswer":"10"}'

# Step 2: verify OTP (replace 123456 with received OTP)
curl -s -X POST http://localhost:5000/api/auth/signup/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-test-email@example.com","otp":"123456"}'
```

4) Local dev note
- In local storage mode, the frontend can show a `Dev OTP` hint in the OTP modal for quick testing.
- In backend API mode, OTP email delivery requires working SMTP config and `ENABLE_EMAIL_NOTIFICATIONS=true`.

5) Troubleshooting
- If emails are not delivered, verify firewall/VPC rules and SMTP credentials.
- For Gmail, consider using an App Password or enable SMTP relay.
- Check server logs for `Email service ready` or errors from `nodemailer`.

If you want, I can add a small health-check endpoint or a test script to trigger a sample OTP email from the server for easier testing.
