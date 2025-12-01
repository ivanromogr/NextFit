import React from 'react';
import DatePicker, { registerLocale } from "react-datepicker";
// 👇 ESTA ES LA LÍNEA QUE ARREGLA EL PANTALLAZO BLANCO
import { es } from 'date-fns/locale'; 
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./GymDateInput.css"; 

registerLocale('es', es);

export default function GymDateInput({ label, value, onChange, maxDate }) {
  
  const selectedDate = value ? new Date(value) : null;

  const handleDateChange = (date) => {
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      onChange({ target: { value: formattedDate } });
    } else {
      onChange({ target: { value: "" } });
    }
  };

  const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'absolute', left: '16px', color: '#FACC15', zIndex: 10, pointerEvents: 'none' }}>
        <Calendar size={20} />
      </div>
      <input
        type="text"
        readOnly
        onClick={onClick}
        ref={ref}
        value={value}
        placeholder="Selecciona una fecha"
        style={{
          width: '100%',
          padding: '16px',
          paddingLeft: '48px',
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '1.1rem',
          outline: 'none',
          fontFamily: 'Inter, sans-serif',
          cursor: 'pointer',
        }}
        onFocus={(e) => {
            e.target.style.borderColor = '#FACC15';
            e.target.style.boxShadow = '0 0 0 1px #FACC15';
        }}
        onBlur={(e) => {
            e.target.style.borderColor = '#3f3f46';
            e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  ));

  return (
    <div style={{ marginBottom: '24px', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '10px', color: '#a1a1aa', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      
      <div className="gym-datepicker-wrapper">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          locale="es"
          dateFormat="dd/MM/yyyy"
          showYearDropdown
          scrollableYearDropdown
          yearDropdownItemNumber={100}
          maxDate={maxDate || new Date()} 
          customInput={<CustomInput />}
          popperPlacement="bottom-start"
        />
      </div>
    </div>
  );
}