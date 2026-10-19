import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GymInput from './GymInput';
import GymButton from './GymButton';

test('password visibility changes without changing the credential', () => {
  const onChangeText = jest.fn();
  const screen = render(<GymInput label="Clave" value="unchanged" secureTextEntry onChangeText={onChangeText} />);
  expect(screen.getByLabelText('Clave').props.secureTextEntry).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña: Clave' }));
  expect(screen.getByLabelText('Clave').props.secureTextEntry).toBe(false);
  expect(screen.getByLabelText('Clave').props.value).toBe('unchanged');
  fireEvent.press(screen.getByRole('button', { name: 'Ocultar contraseña: Clave' }));
  expect(screen.getByLabelText('Clave').props.secureTextEntry).toBe(true);
  expect(onChangeText).not.toHaveBeenCalled();
});

test('passes keyboard submission and focus callbacks to the native input', () => {
  const submit = jest.fn();
  const focus = jest.fn();
  const screen = render(<GymInput label="Correo" autoComplete="email" returnKeyType="next" onSubmitEditing={submit} onFocus={focus} />);
  const input = screen.getByLabelText('Correo');
  expect(input.props.autoComplete).toBe('email');
  expect(input.props.returnKeyType).toBe('next');
  fireEvent(input, 'focus', {});
  fireEvent(input, 'submitEditing', { nativeEvent: { text: 'test@example.com' } });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
});

test('disabled password input cannot reveal its content', () => {
  const screen = render(<GymInput label="Clave" secureTextEntry editable={false} />);
  fireEvent.press(screen.getByRole('button'));
  expect(screen.getByLabelText('Clave').props.secureTextEntry).toBe(true);
});

test('loading button announces its state and rejects repeated presses', () => {
  const onPress = jest.fn();
  const screen = render(<GymButton loading onPress={onPress}>Enviar</GymButton>);
  const button = screen.getByRole('button');
  expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
  fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});
