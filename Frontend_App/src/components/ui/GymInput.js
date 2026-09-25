import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function GymInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  suffix,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
}) {
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = Boolean(secureTextEntry);

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
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            Icon ? { paddingLeft: 10 } : null,
            suffix ? { paddingRight: 45 } : null
          ]}
        />

        {suffix ? (
          <View style={styles.suffixContainer}>
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18, width: '100%' },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '800', letterSpacing: 0.9, marginBottom: 10, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14, height: 56, paddingHorizontal: 14 },
  inputWrapperFocused: { borderColor: 'rgba(250,204,21,0.55)', backgroundColor: 'rgba(255,255,255,0.04)' },
  input: { flex: 1, color: '#ffffff', fontSize: 16, height: '100%' },
  iconContainer: { justifyContent: 'center', alignItems: 'center' },
  suffixContainer: { position: 'absolute', right: 14 },
  suffixText: { color: '#FACC15', fontWeight: '900', fontSize: 13, letterSpacing: 0.6 }
});
