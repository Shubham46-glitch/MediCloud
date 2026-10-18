import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

const fakeSecret = 'synthetic-verification-client-secret';
const email = 'patient@example.test';
const password = 'Synthetic-Password-123!';
const clientId = 'synthetic-client-id';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_PROVIDER: 'mock',
  AUTH_PROVIDER: 'cognito',
  STORAGE_PROVIDER: 'mock',
  EMAIL_PROVIDER: 'mock',
  COGNITO_CLIENT_ID: clientId,
  COGNITO_CLIENT_SECRET: fakeSecret,
  COGNITO_USER_POOL_ID: 'eu-north-1_synthetic',
});

const [{ default: app }, { getAuthAdapter }, { calculateSecretHash }] = await Promise.all([
  import('../src/app.js'),
  import('../src/adapters/auth/index.js'),
  import('../src/adapters/auth/cognito-auth.adapter.js'),
]);

const adapter = getAuthAdapter();
let send;
let profilesById;
let profilesByEmail;
let createCalls;

function makeCognitoUser({ verified = 'true', userId = 'synthetic-cognito-sub' } = {}) {
  return {
    Username: email,
    UserAttributes: [
      { Name: 'sub', Value: userId },
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: verified },
      { Name: 'name', Value: 'Synthetic Patient' },
      { Name: 'phone_number', Value: '+15555550123' },
    ],
  };
}

function makeError(name, message = 'synthetic provider message') {
  const error = new Error(message);
  error.name = name;
  return error;
}

before(() => {
  adapter.repository = {
    getUserById: async (userId) => profilesById.get(userId) || null,
    getUserByEmail: async (value) => profilesByEmail.get(value.toLowerCase()) || null,
    createUser: async (profile) => {
      createCalls += 1;
      const key = profile.email.toLowerCase();
      if (profilesById.has(profile.userId) || profilesByEmail.has(key)) {
        throw makeError('ConditionalCheckFailedException');
      }
      const saved = { ...profile, status: 'active' };
      profilesById.set(profile.userId, saved);
      profilesByEmail.set(key, saved);
      return saved;
    },
    getDoctorByUserId: async () => null,
  };
});

after(() => {
  adapter.cognitoClient.send = async () => { throw new Error('unexpected send outside a test'); };
});

function reset({ profile = null } = {}) {
  profilesById = new Map();
  profilesByEmail = new Map();
  if (profile) {
    profilesById.set(profile.userId, profile);
    profilesByEmail.set(profile.email.toLowerCase(), profile);
  }
  createCalls = 0;
  const commands = [];
  send = async (command) => {
    commands.push(command);
    throw new Error(`No fake response for ${command.constructor.name}`);
  };
  adapter.cognitoClient.send = (command) => send(command, commands);
  return commands;
}

describe('Cognito email verification and profile recovery (mocked AWS only)', () => {
  it('returns a pending confirmation result after SignUp without writing a profile', async () => {
    const commands = reset();
    send = async (command) => {
      commands.push(command);
      return { UserSub: 'synthetic-cognito-sub', UserConfirmed: false, CodeDeliveryDetails: { Destination: 'p***@e***.test' } };
    };
    const response = await request(app).post('/api/auth/register').send({
      email, password, name: 'Synthetic Patient', phone: '+15555550123',
    });

    assert.equal(response.status, 202);
    assert.equal(response.body.needsConfirmation, true);
    assert.equal(response.body.deliveryDestination, 'p***@e***.test');
    assert.equal(commands[0].constructor.name, 'SignUpCommand');
    assert.equal(commands[0].input.SecretHash, calculateSecretHash(email, clientId, fakeSecret));
    assert.equal(createCalls, 0);
  });

  it('confirms a code with SecretHash and returns only a generic success body', async () => {
    const commands = reset();
    send = async (command) => { commands.push(command); return {}; };
    const response = await request(app).post('/api/auth/confirm').send({ email, code: '123456' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true, status: 200, confirmed: true, message: 'Email confirmed. Sign in to continue.',
    });
    assert.equal(commands[0].constructor.name, 'ConfirmSignUpCommand');
    assert.equal(commands[0].input.Username, email);
    assert.equal(commands[0].input.ConfirmationCode, '123456');
    assert.equal(typeof commands[0].input.SecretHash, 'string');
  });

  it('maps invalid, expired, already-confirmed, and throttled confirmation errors', async () => {
    for (const [name, message, expectedStatus, expectedCode] of [
      ['CodeMismatchException', 'provider detail: wrong', 400, 'INVALID_VERIFICATION_CODE'],
      ['ExpiredCodeException', 'provider detail: expired', 400, 'VERIFICATION_CODE_EXPIRED'],
      ['NotAuthorizedException', 'User cannot be confirmed. Current status is CONFIRMED', 409, 'ACCOUNT_ALREADY_CONFIRMED'],
      ['TooManyRequestsException', 'provider detail: slow down', 429, 'TOO_MANY_REQUESTS'],
    ]) {
      reset();
      send = async () => { throw makeError(name, message); };
      const response = await request(app).post('/api/auth/confirm').send({ email, code: '123456' });
      assert.equal(response.status, expectedStatus, name);
      assert.equal(response.body.error.code, expectedCode, name);
      assert.equal(JSON.stringify(response.body).includes(`provider detail: ${message}`), false, name);
    }
  });

  it('resends through Cognito with SecretHash and gives a non-enumerating response', async () => {
    const commands = reset();
    send = async (command) => {
      commands.push(command);
      return { CodeDeliveryDetails: { Destination: 'p***@e***.test' } };
    };
    const success = await request(app).post('/api/auth/resend-confirmation').send({ email });
    assert.equal(success.status, 200);
    assert.equal(success.body.deliveryDestination, 'p***@e***.test');
    assert.equal(commands[0].constructor.name, 'ResendConfirmationCodeCommand');
    assert.equal(typeof commands[0].input.SecretHash, 'string');

    reset();
    send = async () => { throw makeError('UserNotFoundException'); };
    const missing = await request(app).post('/api/auth/resend-confirmation').send({ email });
    assert.equal(missing.status, 200);
    assert.equal(missing.body.message, success.body.message);
  });

  it('returns a clear unconfirmed-account login error without exposing the Cognito message', async () => {
    reset();
    send = async () => { throw makeError('UserNotConfirmedException', `unconfirmed ${email}`); };
    const response = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(JSON.stringify(response.body).includes(email), false);
  });

  it('recovers a missing patient profile only after Cognito authenticates and verifies the email', async () => {
    const commands = reset();
    send = async (command) => {
      commands.push(command);
      if (command.constructor.name === 'InitiateAuthCommand') {
        return { AuthenticationResult: { AccessToken: 'synthetic-access-token' } };
      }
      if (command.constructor.name === 'GetUserCommand') return makeCognitoUser();
      throw new Error(`Unexpected command ${command.constructor.name}`);
    };
    const response = await request(app).post('/api/auth/login').send({
      email, password, name: 'Patient Profile', bloodGroup: 'O+',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.userId, 'synthetic-cognito-sub');
    assert.equal(response.body.user.role, 'patient');
    assert.equal(response.body.user.name, 'Patient Profile');
    assert.equal(response.body.user.bloodGroup, 'O+');
    assert.equal(response.body.token, 'synthetic-access-token');
    assert.equal(createCalls, 1);
    assert.equal(commands.map((command) => command.constructor.name).join(','), 'InitiateAuthCommand,GetUserCommand');
  });

  it('does not overwrite an existing profile during login', async () => {
    const existing = { userId: 'synthetic-cognito-sub', email, role: 'patient', name: 'Existing Profile', status: 'active' };
    const commands = reset({ profile: existing });
    send = async (command) => {
      commands.push(command);
      if (command.constructor.name === 'InitiateAuthCommand') return { AuthenticationResult: { AccessToken: 'synthetic-access-token' } };
      if (command.constructor.name === 'GetUserCommand') return makeCognitoUser();
      throw new Error(`Unexpected command ${command.constructor.name}`);
    };
    const response = await request(app).post('/api/auth/login').send({ email, password, name: 'Attempted Overwrite' });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.name, 'Existing Profile');
    assert.equal(createCalls, 0);
  });

  it('separates a DynamoDB recovery failure from Cognito credential errors', async () => {
    reset();
    adapter.repository.getUserById = async () => { throw makeError('CredentialsProviderError', 'Could not load credentials'); };
    send = async (command) => {
      if (command.constructor.name === 'InitiateAuthCommand') return { AuthenticationResult: { AccessToken: 'synthetic-access-token' } };
      if (command.constructor.name === 'GetUserCommand') return makeCognitoUser();
      throw new Error(`Unexpected command ${command.constructor.name}`);
    };
    const response = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'PROFILE_UNAVAILABLE');
    assert.equal(JSON.stringify(response.body).includes('CredentialsProviderError'), false);
  });
});
