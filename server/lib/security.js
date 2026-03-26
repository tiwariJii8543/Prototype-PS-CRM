const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const helmetMiddleware = helmet({
  crossOriginResourcePolicy: false
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again shortly.' }
});

const complaintWriteRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many write requests. Please slow down and try again.' }
});

const supportRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many support attempts. Please try again later.' }
});

module.exports = {
  helmetMiddleware,
  authRateLimiter,
  complaintWriteRateLimiter,
  supportRateLimiter
};
