import {
  api,
  getAuthIdentities,
  linkGoogleIdentity,
  linkAppleIdentity,
  reauthWithPassword,
  reauthWithGoogle,
  reauthWithApple,
  unlinkGoogleIdentity,
  unlinkAppleIdentity,
} from '../../api/endpoints';

jest.mock('../../api/endpoints', () => {
  const actual = jest.requireActual('../../api/endpoints');
  return { ...actual, api: actual.api };
});

describe('AUTH-10.5 identity API', () => {
  beforeEach(() => {
    jest.spyOn(api, 'get').mockResolvedValue({});
    jest.spyOn(api, 'post').mockResolvedValue({});
    jest.spyOn(api, 'delete').mockResolvedValue({});
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses the eight exact contracts', async () => {
    await getAuthIdentities();
    await linkGoogleIdentity('g');
    await linkAppleIdentity('a', 'n');
    await reauthWithPassword('p', 'GOOGLE');
    await reauthWithGoogle('g', 'APPLE');
    await reauthWithApple('a', 'n', 'GOOGLE');
    await unlinkGoogleIdentity('r');
    await unlinkAppleIdentity('r');

    expect(api.get).toHaveBeenCalledWith('/auth/identities');
    expect(api.post).toHaveBeenCalledWith('/auth/identities/google/link', { credential: 'g' });
    expect(api.post).toHaveBeenCalledWith('/auth/identities/apple/link', { identityToken: 'a', nonce: 'n' });
    expect(api.post).toHaveBeenCalledWith('/auth/identities/reauth/password', { password: 'p', targetProvider: 'GOOGLE' });
    expect(api.post).toHaveBeenCalledWith('/auth/identities/reauth/google', { credential: 'g', targetProvider: 'APPLE' });
    expect(api.post).toHaveBeenCalledWith('/auth/identities/reauth/apple', { identityToken: 'a', nonce: 'n', targetProvider: 'GOOGLE' });
    expect(api.delete).toHaveBeenCalledWith('/auth/identities/google', { data: { reauthToken: 'r' } });
    expect(api.delete).toHaveBeenCalledWith('/auth/identities/apple', { data: { reauthToken: 'r' } });
  });
});
