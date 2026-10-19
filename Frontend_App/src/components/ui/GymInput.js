import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

const GymInput = forwardRef(function GymInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  suffix,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  onFocus, onBlur, editable = true, style, ...inputProps
}, ref) {
  const [isFocused, setIsFocused] = useState(false);

  const [revealed, setRevealed] = useState(false);
  const isSecure = Boolean(secureTextEntry) && !revealed;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}

      <View style={[
        styles.inputWrapper,
        isFocused ? styles.inputWrapperFocused : null
      ]}>
        {Icon ? (
          <View style={styles.iconContainer}>
            <Icon size={20} color="#FACC15" />
          </View>
        ) : null}

        <TextInput
          {...inputProps}
          ref={ref}
          editable={editable}
          accessibilityLabel={inputProps.accessibilityLabel || label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={(event) => { setIsFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setIsFocused(false); onBlur?.(event); }}
          style={[
            styles.input,
            Icon ? { paddingLeft: 10 } : null,
            style
          ]}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${revealed ? 'Ocultar' : 'Mostrar'} contraseña: ${label || 'Contraseña'}`}
            accessibilityState={{ selected: revealed, disabled: !editable }}
            disabled={!editable}
            onPress={() => setRevealed((previous) => !previous)}
            style={styles.visibilityButton}
          >
            <Text style={styles.suffixText}>{revealed ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        ) : null}
        {suffix ? (
          <View style={styles.suffixContainer}>
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export default GymInput;

const styles = StyleSheet.create({
  container: { marginBottom: 18, width: '100%' },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '800', letterSpacing: 0.9, marginBottom: 10, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14, minHeight: 56, paddingHorizontal: 14 },
  inputWrapperFocused: { borderColor: 'rgba(250,204,21,0.55)', backgroundColor: 'rgba(255,255,255,0.04)' },
  input: { flex: 1, color: '#ffffff', fontSize: 16, minWidth: 0, minHeight: 56, paddingVertical: 14 },
  iconContainer: { justifyContent: 'center', alignItems: 'center' },
  suffixContainer: { marginLeft: 8 },
  visibilityButton: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  suffixText: { color: '#FACC15', fontWeight: '900', fontSize: 13, letterSpacing: 0.6 }
});
