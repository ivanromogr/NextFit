import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  View 
} from 'react-native';

export default function GymButton({
  children,
  onPress,
  loading,
  fullWidth,
  disabled,
  variant = 'primary',
  style,
}) {
  const isLoading = Boolean(loading);
  const isDisabled = Boolean(disabled) || isLoading;
  const isSecondary = variant === 'secondary';

  const getButtonStyle = () => {
    if (isDisabled) return styles.disabledButton;
    if (isSecondary) return styles.secondaryButton;
    return styles.primaryButton;
  };

  const getTextStyle = () => {
    if (isDisabled) return styles.disabledText;
    if (isSecondary) return styles.secondaryText;
    return styles.primaryText;
  };

  return (
    <TouchableOpacity
      onPress={isDisabled ? null : onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.baseButton,
        fullWidth ? { width: '100%' } : null,
        getButtonStyle(),
        style ? style : null,
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={isSecondary ? '#FACC15' : '#0A0A0A'} size="small" />
          <Text style={[getTextStyle(), styles.loadingText]}>PROCESANDO...</Text>
        </View>
      ) : (
        <Text style={[styles.baseText, getTextStyle()]}>
          {typeof children === 'string' ? children.toUpperCase() : children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: 8,
  },
  baseText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.7 },
  loadingText: { marginLeft: 10 },
  primaryButton: { backgroundColor: '#FACC15' },
  primaryText: { color: '#0A0A0A' },
  secondaryButton: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' },
  secondaryText: { color: '#FFFFFF' },
  disabledButton: { backgroundColor: '#141416', borderColor: 'rgba(255,255,255,0.08)' },
  disabledText: { color: '#6B7280' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' }
});
