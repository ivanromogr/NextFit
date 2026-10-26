import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import { getGoogleIdToken, hasGoogleSignInConfig } from '../../services/googleSignIn';
import { loginWithGoogle } from '../../api/endpoints';

jest.mock('../../services/googleSignIn', () => ({ hasGoogleSignInConfig: jest.fn(), getGoogleIdToken: jest.fn(), isGoogleCancel: () => false }));
jest.mock('../../api/endpoints', () => ({ loginWithGoogle: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); });

test('does not offer an unusable Google login when native configuration is missing', () => {
  hasGoogleSignInConfig.mockReturnValue(false);
  const view = render(<GoogleSignInButton />);
  expect(view.queryByRole('button', { name: 'CONTINUAR CON GOOGLE' })).toBeNull();
  expect(getGoogleIdToken).not.toHaveBeenCalled();
  expect(loginWithGoogle).not.toHaveBeenCalled();
});

test('configured Google login still delivers the authenticated session', async () => {
  hasGoogleSignInConfig.mockReturnValue(true);
  getGoogleIdToken.mockResolvedValue('fictional-id-token');
  const session = { accessToken: 'fictional-access', user: { id: 'fixture' } };
  loginWithGoogle.mockResolvedValue({ data: session });
  const onAuthenticated = jest.fn();
  const view = render(<GoogleSignInButton onAuthenticated={onAuthenticated} />);
  fireEvent.press(view.getByRole('button', { name: 'CONTINUAR CON GOOGLE' }));
  await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(session));
});
