// Native Google iOS requires the reversed iOS OAuth client ID as a URL scheme.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;
  const match = /^([a-zA-Z0-9-]+)\.apps\.googleusercontent\.com$/.exec(iosClientId);
  if (!match) throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be a Google OAuth client ID');
  return {
    ...config,
    plugins: (config.plugins || []).map(plugin =>
      plugin === '@react-native-google-signin/google-signin'
        ? [plugin, { iosUrlScheme: `com.googleusercontent.apps.${match[1]}` }]
        : plugin
    ),
  };
};
