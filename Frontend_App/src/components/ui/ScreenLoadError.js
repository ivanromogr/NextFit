import React from 'react';
import AccountFormScreen, { FormMessage } from './AccountFormScreen';
import GymButton from './GymButton';

export default function ScreenLoadError({ title, message, onRetry, onBack }) {
  return <AccountFormScreen title={title} backLabel="Volver" onBack={onBack}>
    <FormMessage>{message}</FormMessage>
    <GymButton fullWidth onPress={onRetry}>Reintentar</GymButton>
  </AccountFormScreen>;
}
