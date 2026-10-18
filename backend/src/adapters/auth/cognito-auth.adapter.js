/**
 * CognitoAuthAdapter — Real Amazon Cognito authentication adapter.
 *
 * Uses aws-jwt-verify to verify Cognito access tokens on the backend.
 * Registration and login are mediated by the backend AWS SDK.
 *
 * This adapter is used when AUTH_PROVIDER=cognito in the environment.
 * It requires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID to be set.
 *
 * Security:
 *   - Access tokens are verified using the Cognito JWKS (public keys).
 *   - Token issuer, expiration, and user pool are validated.
 *   - A decoded JWT is NOT trusted without cryptographic verification.
 *   - Roles come from the server-side user profile after token verification.
 */

import { createHmac } from 'node:crypto';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  GetUserCommand,
  RespondToAuthChallengeCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getRepository } from '../../repository/index.js';

/**
 * Calculate Cognito's client secret hash for a username and app client.
 * The secret remains backend-only and is never included in logs or responses.
 */
export function calculateSecretHash(username, clientId, clientSecret) {
  return createHmac('sha256', clientSecret)
    .update(`${username}${clientId}`, 'utf8')
    .digest('base64');
}

const DIAGNOSTIC_MESSAGE_MAX_LENGTH = 512;

function collectSensitiveStrings(value) {
  if (typeof value === 'string') return value ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectSensitiveStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectSensitiveStrings);
  return [];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeRegistrationDiagnostic(message, sensitiveValues) {
  let safeMessage = typeof message === 'string' && message.trim()
    ? message
    : 'No diagnostic message provided';

  const uniqueSensitiveValues = [...new Set(sensitiveValues)]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .sort((a, b) => b.length - a.length);
  for (const value of uniqueSensitiveValues) {
    safeMessage = safeMessage.replace(new RegExp(escapeRegExp(value), 'giu'), '[REDACTED]');
  }

  return safeMessage
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[REDACTED_EMAIL]')
    .replace(/\bBearer\s+[A-Z0-9._~+/=-]+/giu, 'Bearer [REDACTED_TOKEN]')
    .replace(/\beyJ[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\b/giu, '[REDACTED_TOKEN]')
    .replace(/\b(?:access[ _-]?token|id[ _-]?token|refresh[ _-]?token|session|token|secret[ _-]?hash|client[ _-]?secret|password)\s*[:=]\s*["']?[^\s,;"']{4,}["']?/giu, '[REDACTED_SECRET]')
    .replace(/\+?\d[\d\s().-]{6,}\d/gu, '[REDACTED_PHONE]')
    .slice(0, DIAGNOSTIC_MESSAGE_MAX_LENGTH);
}

function getRegistrationFailure(err) {
  if (err?.name === 'UsernameExistsException') {
    return {
      success: true,
      status: 202,
      needsConfirmation: true,
      message: 'If this address has an account that needs confirmation, you can request a code or sign in.',
    };
  }
  return {
    success: false,
    status: 502,
    error: 'REGISTRATION_FAILED',
    message: 'Registration could not be completed. Please try again.',
  };
}

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return undefined;
  const [local, domain] = email.split('@');
  const [host, ...suffix] = domain.split('.');
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${suffix.length ? `.${suffix.join('.')}` : ''}`;
}

function logCognitoFailure(stage, err, sensitiveValues = []) {
  const exceptionName = typeof err?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,79}$/u.test(err.name)
    ? err.name
    : 'UnknownError';
  logger.warn('Cognito authentication operation failed', {
    stage,
    exceptionName,
    diagnosticMessage: sanitizeRegistrationDiagnostic(err?.message, sensitiveValues),
  });
}

function mapConfirmationFailure(err) {
  if (err?.name === 'CodeMismatchException') {
    return { success: false, status: 400, error: 'INVALID_VERIFICATION_CODE', message: 'That code is invalid. Check it and try again.' };
  }
  if (err?.name === 'ExpiredCodeException') {
    return { success: false, status: 400, error: 'VERIFICATION_CODE_EXPIRED', message: 'That code has expired. Request a new code.' };
  }
  if (err?.name === 'NotAuthorizedException' && /current status is confirmed|already confirmed/iu.test(err.message || '')) {
    return { success: false, status: 409, error: 'ACCOUNT_ALREADY_CONFIRMED', message: 'This account may already be confirmed. Try signing in.' };
  }
  if (err?.name === 'TooManyRequestsException' || err?.name === 'LimitExceededException') {
    return { success: false, status: 429, error: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Wait a while and try again.' };
  }
  if (err?.name === 'AliasExistsException') {
    return { success: false, status: 409, error: 'EMAIL_ALREADY_IN_USE', message: 'This email cannot be confirmed for this account. Contact support.' };
  }
  return { success: false, status: 502, error: 'CONFIRMATION_FAILED', message: 'We could not confirm the account. Please try again.' };
}

function mapLoginFailure(err) {
  if (err?.name === 'UserNotConfirmedException') {
    return { success: false, status: 403, error: 'EMAIL_NOT_VERIFIED', message: 'Confirm your email before signing in.' };
  }
  if (err?.name === 'TooManyRequestsException' || err?.name === 'LimitExceededException') {
    return { success: false, status: 429, error: 'TOO_MANY_REQUESTS', message: 'Too many sign-in attempts. Wait a while and try again.' };
  }
  return { success: false, status: 401, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
}

function logRegistrationFailure(stage, err, sensitiveValues) {
  const exceptionName = typeof err?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,79}$/u.test(err.name)
    ? err.name
    : 'UnknownError';
  const awsRequestId = typeof err?.$metadata?.requestId === 'string'
    ? err.$metadata.requestId.slice(0, 128)
    : undefined;

  logger.error('Cognito registration failed', {
    stage,
    exceptionName,
    diagnosticMessage: sanitizeRegistrationDiagnostic(err?.message, sensitiveValues),
    ...(awsRequestId ? { awsRequestId } : {}),
  });
}

export class CognitoAuthAdapter {
  constructor() {
    this.userPoolId = env.COGNITO_USER_POOL_ID;
    this.clientId = env.COGNITO_CLIENT_ID;
    this.clientSecret = env.COGNITO_CLIENT_SECRET;
    this.region = env.AWS_REGION;

    // Create the JWT verifier — this caches the Cognito JWKS automatically
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: this.userPoolId,
      tokenUse: 'access',
      clientId: this.clientId,
    });

    // Cognito SDK client for registration/auth flows
    this.cognitoClient = new CognitoIdentityProviderClient({ region: this.region });
    this.repository = getRepository();

    logger.info('CognitoAuthAdapter initialized', {
      userPoolId: this.userPoolId,
      region: this.region,
    });
  }

  /**
   * Register a new patient via Cognito SignUp.
   * Only 'patient' role is assigned — Doctor/Admin roles require a trusted admin process
   * (e.g., post-confirmation Lambda or admin API with elevated credentials).
   */
  async register({ email, password, name, phone, ...extraFields }) {
    const secretHash = calculateSecretHash(email, this.clientId, this.clientSecret);
    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ];
    if (phone) userAttributes.push({ Name: 'phone_number', Value: phone });

    const command = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      SecretHash: secretHash,
      UserAttributes: userAttributes,
    });
    const sensitiveValues = [
      email,
      phone,
      name,
      password,
      this.clientSecret,
      secretHash,
      ...collectSensitiveStrings(extraFields),
    ];

    let response;
    try {
      response = await this.cognitoClient.send(command);
    } catch (err) {
      logRegistrationFailure('cognito-signup', err, sensitiveValues);
      if (err?.name === 'UsernameExistsException') {
        return {
          ...getRegistrationFailure(err),
          deliveryDestination: maskEmail(email),
        };
      }
      return getRegistrationFailure(err);
    }

    const needsConfirmation = response.UserConfirmed !== true;
    return {
      success: true,
      status: needsConfirmation ? 202 : 201,
      needsConfirmation,
      deliveryDestination: response.CodeDeliveryDetails?.Destination || maskEmail(email),
      message: needsConfirmation
        ? 'Check your email for a confirmation code.'
        : 'Account created. Sign in to finish setting up your patient profile.',
    };
  }

  async confirmSignUp({ email, code }) {
    try {
      await this.cognitoClient.send(new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        SecretHash: calculateSecretHash(email, this.clientId, this.clientSecret),
      }));
      return { success: true, confirmed: true };
    } catch (err) {
      logCognitoFailure('confirm-signup', err, [email, code, this.clientSecret]);
      return mapConfirmationFailure(err);
    }
  }

  async resendConfirmationCode({ email }) {
    try {
      const response = await this.cognitoClient.send(new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
        SecretHash: calculateSecretHash(email, this.clientId, this.clientSecret),
      }));
      return {
        success: true,
        message: 'If this account can receive a confirmation code, one has been sent.',
        deliveryDestination: response.CodeDeliveryDetails?.Destination || maskEmail(email),
      };
    } catch (err) {
      logCognitoFailure('resend-confirmation', err, [email, this.clientSecret]);
      if (err?.name === 'TooManyRequestsException' || err?.name === 'LimitExceededException') {
        return { success: false, status: 429, error: 'TOO_MANY_REQUESTS', message: 'Too many requests. Wait a while and try again.' };
      }
      if (err?.name === 'UserNotFoundException' || err?.name === 'NotAuthorizedException') {
        return {
          success: true,
          message: 'If this account can receive a confirmation code, one has been sent.',
          deliveryDestination: maskEmail(email),
        };
      }
      return { success: false, status: 502, error: 'RESEND_FAILED', message: 'We could not send a code. Please try again.' };
    }
  }

  /**
   * Login via Cognito USER_PASSWORD_AUTH flow.
   * Returns a backend-mediated access token only.
   */
  async login({ email, password, profileDraft = {} }) {
    let response;
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: calculateSecretHash(email, this.clientId, this.clientSecret),
        },
      });

      response = await this.cognitoClient.send(command);
    } catch (err) {
      logCognitoFailure('initiate-auth', err, [email, password, this.clientSecret]);
      return mapLoginFailure(err);
    }

    if (!response.AuthenticationResult?.AccessToken) {
      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        return { success: false, status: 409, error: 'NEW_PASSWORD_REQUIRED', message: 'Password change required. Please set a new password.' };
      }
      return { success: false, status: 401, error: 'AUTH_FAILED', message: 'Authentication failed.' };
    }

    const accessToken = response.AuthenticationResult.AccessToken;
    let userResponse;
    try {
      userResponse = await this.cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
    } catch (err) {
      logCognitoFailure('get-authenticated-user', err, [email, password, accessToken, this.clientSecret]);
      return { success: false, status: 502, error: 'AUTHENTICATED_USER_LOOKUP_FAILED', message: 'Sign-in succeeded but account details could not be loaded. Please try again.' };
    }

    const attributes = Object.fromEntries((userResponse.UserAttributes || []).map(({ Name, Value }) => [Name, Value]));
    const userId = attributes.sub || userResponse.Username;
    const verifiedEmail = attributes.email;
    if (!userId || !verifiedEmail || verifiedEmail.toLowerCase() !== email.toLowerCase()) {
      return { success: false, status: 403, error: 'ACCOUNT_UNAVAILABLE', message: 'This account is unavailable. Contact support.' };
    }

    let profile;
    try {
      profile = await this.repository.getUserById(userId);
      if (!profile) {
        if (attributes.email_verified !== 'true') {
          return { success: false, status: 403, error: 'EMAIL_NOT_VERIFIED', message: 'Confirm your email before completing account setup.' };
        }

        const patientProfile = {
          userId,
          email: verifiedEmail,
          role: 'patient',
          name: profileDraft.name || attributes.name || verifiedEmail,
          phone: profileDraft.phone || attributes.phone_number,
          bloodGroup: profileDraft.bloodGroup,
          dateOfBirth: profileDraft.dateOfBirth,
          gender: profileDraft.gender,
          cognitoSub: userId,
        };
        try {
          profile = await this.repository.createUser(patientProfile);
          logger.info('CognitoAuth: patient profile recovered after verified sign-in', { userId });
        } catch (createError) {
          // A concurrent retry can win the conditional write. Re-read and accept
          // only the profile that belongs to this same verified Cognito subject.
          const existing = await this.repository.getUserById(userId);
          if (existing?.email?.toLowerCase() === verifiedEmail.toLowerCase() && existing.role === 'patient') {
            profile = existing;
          } else {
            throw createError;
          }
        }
      }
    } catch (err) {
      logRegistrationFailure('dynamodb-profile-persistence', err, [email, password, this.clientSecret, accessToken]);
      return { success: false, status: 503, error: 'PROFILE_UNAVAILABLE', message: 'Sign-in succeeded, but your patient profile could not be loaded. Please try again later.' };
    }

    if (!profile || profile.status === 'inactive' || !['patient', 'doctor', 'admin'].includes(profile.role)) {
      return { success: false, status: 403, error: 'ACCOUNT_UNAVAILABLE', message: 'This account is unavailable. Contact support.' };
    }

    const doctorProfile = profile.role === 'doctor'
      ? await this.repository.getDoctorByUserId?.(userId)
      : null;
    logger.info('CognitoAuth: user logged in', { userId, role: profile.role });
    return {
      success: true,
      user: {
        ...profile,
        userId,
        email: profile.email,
        name: profile.name || attributes.name || verifiedEmail,
        role: profile.role,
        ...(doctorProfile ? { doctorId: doctorProfile.doctorId } : {}),
      },
      token: accessToken,
    };
  }

  /**
   * Verify a Cognito access token using aws-jwt-verify.
   * This performs full cryptographic verification against the Cognito JWKS.
   * A decoded JWT is NEVER trusted without this verification.
   */
  async verifyToken(token) {
    try {
      const payload = await this.verifier.verify(token);
      return { valid: true, payload };
    } catch (err) {
      logger.warn('CognitoAuth: token verification failed', { errorType: err.name || 'TokenVerificationError' });
      return { valid: false, error: 'TOKEN_INVALID', message: 'Access token is invalid or expired.' };
    }
  }

  /**
   * Get user profile from DynamoDB using the Cognito sub (userId).
   */
  async getUserProfile(userId) {
    const user = await this.repository.getUserById(userId);
    if (!user || user.status === 'inactive' || !['patient', 'doctor', 'admin'].includes(user.role)) return null;
    const doctorProfile = user.role === 'doctor'
      ? await this.repository.getDoctorByUserId?.(userId)
      : null;
    return this._sanitizeUser({ ...user, ...(doctorProfile ? { doctorId: doctorProfile.doctorId } : {}) });
  }

  async updateProfile(userId, updates) {
    const { role, passwordHash, cognitoSub, ...safeUpdates } = updates;
    const updated = await this.repository.updateUser(userId, safeUpdates);
    return updated ? this._sanitizeUser(updated) : null;
  }

  async logout(accessToken) {
    if (!accessToken) return { success: true };
    await this.cognitoClient.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
    return { success: true };
  }

  _sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
