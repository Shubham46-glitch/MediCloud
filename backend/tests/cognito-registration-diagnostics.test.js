import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const testValues = {
  email: 'synthetic.patient@example.test',
  phone: '+91 (98765) 43210',
  name: 'Synthetic Patient',
  password: 'Synthetic-Password-123!',
  clientSecret: 'synthetic-client-secret-never-real',
  secretHash: 'synthetic-secret-hash-never-real',
  token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJzeW50aGV0aWMifQ.signature-value',
};

// Keep every provider local in this test process. Cognito SDK calls are stubbed below.
process.env.NODE_ENV = 'test';
process.env.DB_PROVIDER = 'mock';
process.env.AUTH_PROVIDER = 'mock';
process.env.STORAGE_PROVIDER = 'mock';
process.env.EMAIL_PROVIDER = 'mock';
process.env.COGNITO_CLIENT_ID = 'synthetic-client-id';
process.env.COGNITO_CLIENT_SECRET = testValues.clientSecret;

const [{ CognitoAuthAdapter }, { getAuthAdapter }, { handleRegister }, { default: logger }] = await Promise.all([
  import('../src/adapters/auth/cognito-auth.adapter.js'),
  import('../src/adapters/auth/index.js'),
  import('../src/controllers/auth.controller.js'),
  import('../src/utils/logger.js'),
]);

function makeAdapter(send, createUser = async (user) => user) {
  const adapter = new CognitoAuthAdapter();
  adapter.cognitoClient.send = send;
  adapter.repository = { createUser };
  return adapter;
}

async function captureErrorLogs(run) {
  const originalError = logger.error;
  const entries = [];
  logger.error = (...args) => entries.push(args);
  try {
    return { result: await run(), entries };
  } finally {
    logger.error = originalError;
  }
}

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const registerInput = {
  email: testValues.email,
  password: testValues.password,
  name: testValues.name,
  phone: testValues.phone,
};

describe('Cognito registration diagnostics (mocked Cognito; no AWS calls)', () => {
  it('logs the exception name and a redacted, length-limited message without changing the generic API response', async () => {
    const rawMessage = [
      'Invalid phone_number format',
      `email=${testValues.email}`,
      `phone=${testValues.phone}`,
      `name=${testValues.name}`,
      `password=${testValues.password}`,
      `clientSecret=${testValues.clientSecret}`,
      `secretHash=${testValues.secretHash}`,
      `accessToken=${testValues.token}`,
      'x'.repeat(700),
    ].join('; ');
    const cognitoAdapter = makeAdapter(async () => {
      const error = new Error(rawMessage);
      error.name = 'InvalidParameterException';
      error.$metadata = { requestId: 'synthetic-aws-request-id' };
      throw error;
    });

    const authAdapter = getAuthAdapter();
    const originalRegister = authAdapter.register;
    authAdapter.register = (input) => cognitoAdapter.register(input);
    try {
      const { result, entries } = await captureErrorLogs(async () => {
        const response = makeResponse();
        await handleRegister({ body: registerInput }, response);
        return response;
      });

      assert.equal(result.statusCode, 502);
      assert.equal(result.body.error.code, 'REGISTRATION_FAILED');
      assert.equal(result.body.error.message, 'Registration could not be completed. Please try again.');
      assert.equal(JSON.stringify(result.body).includes(rawMessage), false);

      assert.equal(entries.length, 1);
      assert.equal(entries[0][0], 'Cognito registration failed');
      const metadata = entries[0][1];
      assert.equal(metadata.stage, 'cognito-signup');
      assert.equal(metadata.exceptionName, 'InvalidParameterException');
      assert.equal(metadata.awsRequestId, 'synthetic-aws-request-id');
      assert.match(metadata.diagnosticMessage, /Invalid phone_number format/u);
      assert.ok(metadata.diagnosticMessage.length <= 512);
      for (const privateValue of Object.values(testValues)) {
        assert.equal(metadata.diagnosticMessage.includes(privateValue), false, Object.keys(testValues).find((key) => testValues[key] === privateValue));
      }
      assert.equal('error' in metadata, false);
      assert.equal('command' in metadata, false);
    } finally {
      authAdapter.register = originalRegister;
    }
  });

  it('routes UsernameExistsException into the same generic confirmation recovery flow', async () => {
    const cognitoAdapter = makeAdapter(async () => {
      const error = new Error(`User ${testValues.email} already exists`);
      error.name = 'UsernameExistsException';
      throw error;
    });
    const authAdapter = getAuthAdapter();
    const originalRegister = authAdapter.register;
    authAdapter.register = (input) => cognitoAdapter.register(input);

    try {
      const response = makeResponse();
      await handleRegister({ body: registerInput }, response);
      assert.equal(response.statusCode, 202);
      assert.equal(response.body.needsConfirmation, true);
      assert.match(response.body.message, /request a code or sign in/u);
      assert.equal(JSON.stringify(response.body).includes(testValues.email), false);
    } finally {
      authAdapter.register = originalRegister;
    }
  });

  it('does not persist a profile before Cognito email confirmation', async () => {
    let persistenceCalls = 0;
    const cognitoAdapter = makeAdapter(
      async () => ({ UserSub: 'synthetic-user-sub', UserConfirmed: false }),
      async () => { persistenceCalls += 1; },
    );

    const result = await cognitoAdapter.register(registerInput);
    assert.equal(result.status, 202);
    assert.equal(result.needsConfirmation, true);
    assert.equal(persistenceCalls, 0);
  });
});
