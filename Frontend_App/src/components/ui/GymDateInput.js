import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function GymDateInput({ label, value, onChangeText, maxDate }) {
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    // Formateamos a "YYYY-MM-DD"
    const formattedDate = date.toISOString().split('T')[0];
    onChangeText(formattedDate);
    hideDatePicker();
  };

  // Formato bonito para mostrar en el botón (DD/MM/YYYY)
  const prettyValue = value ? value.split('-').reverse().join('/') : "";

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {/* Botón táctil que abre el modal */}
      <TouchableOpacity 
        style={styles.inputButton}
        onPress={showDatePicker}
        activeOpacity={0.8}
      >
        <Calendar size={20} color="#FACC15" style={styles.iconLeft} />
        
        <Text style={[styles.text, !value && styles.textPlaceholder]}>
          {prettyValue || "Selecciona una fecha"}
        </Text>
        
        <ChevronDown size={18} color="rgba(255,255,255,0.55)" style={styles.iconRight} />
      </TouchableOpacity>

      {/* Modal de calendario (JavaScript puro, funciona en Expo) */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
        maximumDate={maxDate || new Date()}
        isDarkModeEnabled={true}
        textColor="#FACC15"
        buttonTextColorIOS="#FACC15"
        pickerContainerStyleIOS={{ backgroundColor: '#18181b' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,24,27,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  inputButtonActive: {
    borderColor: 'rgba(250,204,21,0.55)',
  },
  iconLeft: {
    marginRight: 12,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  textPlaceholder: {
    color: 'rgba(255,255,255,0.55)',
  },
  iconRight: {
    marginLeft: 10,
  }
});