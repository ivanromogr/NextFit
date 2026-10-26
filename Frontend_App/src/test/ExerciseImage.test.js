import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import ExerciseImage from '../components/ui/ExerciseImage';
jest.mock('../config/environment', () => ({ BASE_URL: 'https://api.example.invalid' }));

test('resolves the backend exercise proxy for native Image without provider credentials', () => {
  const view = render(<ExerciseImage uri="/api/ejercicios/imagen/fixture-123" accessibilityLabel="Ejercicio" />);
  expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://api.example.invalid/api/ejercicios/imagen/fixture-123');
  expect(view.getByLabelText('Ejercicio')).toBeTruthy();
});
test('preserves authorized external media and component styling', () => {
  const style = { width: 90, height: 90 };
  const view = render(<ExerciseImage uri="https://media.example.invalid/exercise.png" style={style} />);
  expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://media.example.invalid/exercise.png');
  expect(view.UNSAFE_getByType(Image).props.style).toEqual(style);
});
