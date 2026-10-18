import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Use only local mock providers and a synthetic secret in these unit tests.
const fakeSecret = 'synthetic-cognito-client-secret-for-tests';
const username = 'patient@example.test';
const clientId = 'synthetic-app-client-id';
process.env.DB_PROVIDER = 'mock';
process.env.AUTH_PROVIDER = 'cognito';
process.env.STORAGE_PROVIDER = 'mock';
process.env.EMAIL_PROVIDER = 'mock';
process.env.COGNITO_CLIENT_SECRET = fakeSecret;
process.env.COGNITO_CLIENT_ID = clientId;

const { CognitoAuthAdapter, calculateSecretHash } = await import('../src/adapters/auth/cognito-auth.adapter.js');

const expectedHash = 'pGpldGtcB8Yv+r3gRvhIsOVyFXLtOAeeNmYcY4UiGwI=';

function createAdapterWithFakeCognito() {
  const adapter = new CognitoAuthAdapter();
  const commands = [];
  adapter.cognitoClient.send = async (command) => {
    commands.push(command);
    switch (command.constructor.name) {
      case 'SignUpCommand':
        return { UserSub: 'synthetic-user-sub', UserConfirmed: true };
      case 'InitiateAuthCommand':
        return { AuthenticationResult: { AccessToken: 'synthetic-access-token' } };
      case 'GetUserCommand':
        return {
          Username: username,
          UserAttributes: [
            { Name: 'sub', Value: 'synthetic-user-sub' },
            { Name: 'name', Value: 'Synthetic Patient' },
            { Name: 'email', Value: username },
            { Name: 'email_verified', Value: 'true' },
          ],
        };
      default:
        throw new Error(`Unexpected Cognito command in unit test: ${command.constructor.name}`);
    }
  };
  adapter.repository = {
    createUser: async (user) => user,
    getUserById: async (userId) => ({ userId, role: 'patient', status: 'active', email: username }),
  };
  return { adapter, commands };
}

describe('Cognito client-secret compatibility (no AWS calls)', () => {
  it('calculates the HMAC-SHA256 Base64 secret hash', () => {
    assert.equal(calculateSecretHash(username, clientId, fakeSecret), expectedHash);
  });

  it('includes SecretHash in SignUp', async () => {
    const { adapter, commands } = createAdapterWithFakeCognito();
    const result = await adapter.register({ email: username, password: 'Synthetic-Password-123!', name: 'Synthetic Patient' });

    assert.equal(result.success, true);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].constructor.name, 'SignUpCommand');
    assert.equal(commands[0].input.SecretHash, expectedHash);
  });

  it('includes SECRET_HASH in InitiateAuth and leaves GetUser token-based', async () => {
    const { adapter, commands } = createAdapterWithFakeCognito();
    const result = await adapter.login({ email: username, password: 'Synthetic-Password-123!' });

    assert.equal(result.success, true);
    assert.equal(commands.length, 2);
    assert.equal(commands[0].constructor.name, 'InitiateAuthCommand');
    assert.equal(commands[0].input.AuthParameters.SECRET_HASH, expectedHash);
    assert.equal(commands[1].constructor.name, 'GetUserCommand');
    assert.deepEqual(commands[1].input, { AccessToken: 'synthetic-access-token' });
  });
});
