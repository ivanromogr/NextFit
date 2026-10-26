import React from 'react';
import { Image } from 'react-native';
import { BASE_URL } from '../../config/environment';

// Native Image needs an absolute URL; catalog responses use the credential-free proxy.
export default function ExerciseImage({ uri, ...props }) {
  const resolved = uri?.startsWith('/api/ejercicios/imagen/') ? `${BASE_URL}${uri}` : uri;
  return <Image {...props} source={{ uri: resolved }} />;
}
