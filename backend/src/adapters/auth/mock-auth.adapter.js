/**
 * MockAuthAdapter — In-memory authentication adapter for development.
 *
 * DEVELOPMENT/TEST ONLY. Simulates Cognito authentication without
 * requiring real AWS Cognito resources. Issues simple signed tokens
 * (base64-encoded JSON with HMAC) that the mock auth verifier can validate.
 *
 * In production, use CognitoAuthAdapter with real Amazon Cognito.
 *
 * Security notes:
 *   - Passwords are hashed with Node's built-in scrypt (synchronous, simple).
 *   - Tokens use process-local HMAC signing material (local development only).
 *   - This adapter NEVER grants Doctor or Admin roles through public registration.
 *   - Role assignment is only possible through the admin seed data or direct
 *     repository manipulation (simulating a trusted admin process).
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getRepository } from '../../repository/index.js';

// HMAC secret for local mock tokens. In production, Cognito handles this.
// Process-local signing material keeps mock credentials non-portable and avoids
// shipping a reusable secret in source. Mock sessions end when this process exits.
const TOKEN_SECRET = randomBytes(32);
const TOKEN_PREFIX = 'mock.';

export class MockAuthAdapter {
  constructor() {
    this.repository = getRepository();
    logger.info('MockAuthAdapter initialized (development mode)');
  }

  /**
   * Register a new patient. Only 'patient' role is allowed through public registration.
   * Doctor/Admin roles must be assigned through a trusted administrative process.
   */
  async register({ email, password, name, phone, ...extraFields }) {
    // Check if user already exists
    const existing = await this.repository.getUserByEmail(email);
    if (existing) {
      return { success: false, error: 'EMAIL_ALREADY_REGISTERED', message: 'An account with this email already exists.' };
    }

    // Hash password
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    const hashedPassword = `${salt}:${hash}`;

    // Create user record — always 'patient' role for public registration
    let user;
    try {
      user = await this.repository.createUser({
        email,
        passwordHash: hashedPassword,
        role: 'patient',
        name,
        phone,
        ...extraFields,
      });
    } catch (error) {
      if (error.code === 'EMAIL_ALREADY_REGISTERED') {
        return { success: false, status: 409, error: error.code, message: error.message };
      }
      throw error;
    }

    // Generate a token
    const token = this._signToken({
      userId: user.userId,
      email: user.email,
      role: 'patient',
    });

    logger.info('MockAuth: patient registered', { userId: user.userId });
    return { success: true, user: this._sanitizeUser(user), token };
  }

  /**
   * Login with email and password. Verifies the password hash.
   */
  async login({ email, password }) {
    const user = await this.repository.getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    if (user.status !== 'active') {
      return { success: false, error: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' };
    }

    // Verify password
    const isValid = this._verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const token = this._signToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    logger.info('MockAuth: user logged in', { userId: user.userId, role: user.role });
    return { success: true, user: this._sanitizeUser(user), token };
  }

  /**
   * Verify a mock token and return the decoded payload.
   * Used by the auth middleware to authenticate requests.
   */
  async verifyToken(token) {
    if (!token || !token.startsWith(TOKEN_PREFIX)) {
      return { valid: false, error: 'INVALID_TOKEN_FORMAT' };
    }

    try {
      const raw = token.slice(TOKEN_PREFIX.length);
      const [payloadB64, signature] = raw.split('.');
      const expectedSig = createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('hex');

      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
        return { valid: false, error: 'INVALID_SIGNATURE' };
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

      // Check expiration
      if (payload.exp && Date.now() > payload.exp) {
        return { valid: false, error: 'TOKEN_EXPIRED' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: 'TOKEN_PARSE_ERROR' };
    }
  }

  /**
   * Get user profile by userId (for the /me endpoint).
   */
  async getUserProfile(userId) {
    const user = await this.repository.getUserById(userId);
    if (!user || user.status === 'inactive' || !['patient', 'doctor', 'admin'].includes(user.role)) return null;
    const doctorProfile = user.role === 'doctor'
      ? await this.repository.getDoctorByUserId?.(userId)
      : null;
    return this._sanitizeUser({ ...user, ...(doctorProfile ? { doctorId: doctorProfile.doctorId } : {}) });
  }

  /**
   * Update user profile.
   */
  async updateProfile(userId, updates) {
    // Never allow role changes through this method
    const { role, passwordHash, ...safeUpdates } = updates;
    const updated = await this.repository.updateUser(userId, safeUpdates);
    return updated ? this._sanitizeUser(updated) : null;
  }

  // ── Private helpers ──

  _signToken(payload) {
    const fullPayload = {
      ...payload,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64');
    const signature = createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('hex');
    return `${TOKEN_PREFIX}${payloadB64}.${signature}`;
  }

  _verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const hashBuf = Buffer.from(hash, 'hex');
    const testHash = scryptSync(password, salt, 64);
    return hashBuf.length === testHash.length && timingSafeEqual(hashBuf, testHash);
  }

  _sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
