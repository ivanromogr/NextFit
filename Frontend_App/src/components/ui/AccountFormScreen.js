import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountFormScreen({ title, description, children, backLabel, onBack }) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            {children}
            {onBack ? <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.back}>
              <Text style={styles.backText}>{backLabel}</Text>
            </TouchableOpacity> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormMessage({ children, success = false }) {
  if (!children) return null;
  return <Text accessibilityRole={success ? 'text' : 'alert'} accessibilityLiveRegion="polite" style={[styles.message, success && styles.success]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090b' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, backgroundColor: '#18181b', borderColor: '#27272a', borderWidth: 1, borderRadius: 24, padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  description: { color: '#a1a1aa', fontSize: 15, lineHeight: 23, marginBottom: 24 },
  message: { color: '#fca5a5', fontSize: 15, lineHeight: 23, marginBottom: 16 },
  success: { color: '#d9f99d' },
  back: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingVertical: 10 },
  backText: { color: '#FACC15', textAlign: 'center', fontSize: 15, fontWeight: '600' },
});
