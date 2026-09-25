import React, { useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import { Calendar, ChevronDown } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

export default function GymDateInput({ label, value, onChange, maxDate }) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => (value ? new Date(value) : null), [value]);

  const handleDateChange = (date) => {
    if (date) {
      const formattedDate = date.toISOString().split("T")[0];
      onChange({ target: { value: formattedDate } });
      setOpen(false);
    } else {
      onChange({ target: { value: "" } });
    }
  };

  const prettyValue = useMemo(() => {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }, [value]);

  // Meses en español para el selector
  const months = useMemo(
    () => [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ],
    []
  );

  // Rango de años (ajústalo si quieres)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 1900;
    const list = [];
    for (let y = currentYear; y >= startYear; y--) list.push(y);
    return list;
  }, []);

  const maxAllowedDate = maxDate || new Date();

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        .nf-inline-datepicker .react-datepicker{
          width: 100%;
          border: none;
          background: transparent;
          font-family: Inter, sans-serif;
        }

        .nf-inline-datepicker .react-datepicker__month-container{
          width: 100%;
        }

        .nf-inline-datepicker .react-datepicker__header{
          background: transparent;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 12px 10px 10px;
        }

        /* Ocultamos el "current-month" default porque lo sustituimos por header custom */
        .nf-inline-datepicker .react-datepicker__current-month{
          display: none;
        }

        .nf-inline-datepicker .react-datepicker__navigation-icon::before{
          border-color: #FACC15;
          border-width: 2px 2px 0 0;
        }

        .nf-inline-datepicker .react-datepicker__day-name{
          color: rgba(250,204,21,0.95);
          font-weight: 800;
        }

        .nf-inline-datepicker .react-datepicker__day{
          color:#fff;
          border-radius: 999px;
          transition: all .14s ease;
        }

        .nf-inline-datepicker .react-datepicker__day:hover{
          background: rgba(255,255,255,0.08);
          color:#FACC15;
        }

        .nf-inline-datepicker .react-datepicker__day--today{
          font-weight: 900;
          color:#FACC15;
          border: 1px solid rgba(250,204,21,0.55);
          background: transparent;
        }

        .nf-inline-datepicker .react-datepicker__day--selected,
        .nf-inline-datepicker .react-datepicker__day--keyboard-selected{
          background: linear-gradient(135deg, #FACC15, #EAB308);
          color:#000;
          font-weight: 900;
          box-shadow: 0 0 18px rgba(250,204,21,0.25);
        }

        .nf-inline-datepicker .react-datepicker__day--outside-month{
          color: rgba(255,255,255,0.25);
        }

        .nf-date-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .nf-date-selects{
          display:flex;
          align-items:center;
          gap: 10px;
          flex: 1;
          justify-content:center;
        }

        .nf-date-select{
          appearance:none;
          -webkit-appearance:none;
          -moz-appearance:none;
          background: rgba(24,24,27,0.92);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          border-radius: 12px;
          padding: 10px 34px 10px 12px;
          font-weight: 900;
          letter-spacing: 1px;
          outline: none;
          cursor: pointer;
          position: relative;
        }

        .nf-date-select:focus{
          border-color: rgba(250,204,21,0.55);
          box-shadow: 0 0 0 3px rgba(250,204,21,0.12);
        }

        .nf-nav-btn{
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(24,24,27,0.65);
          color: #FACC15;
          cursor: pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          transition: transform .12s ease, border-color .12s ease, background .12s ease;
        }

        .nf-nav-btn:disabled{
          opacity: .35;
          cursor: not-allowed;
        }

        .nf-nav-btn:hover:not(:disabled){
          border-color: rgba(250,204,21,0.55);
          background: rgba(24,24,27,0.85);
          transform: translateY(-1px);
        }

        .nf-chevron{
          font-size: 18px;
          line-height: 1;
        }
      `}</style>

      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 10,
            color: "#a1a1aa",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "16px",
          paddingLeft: "48px",
          paddingRight: "44px",
          background: "rgba(24,24,27,0.92)",
          border: open
            ? "1px solid rgba(250,204,21,0.55)"
            : "1px solid rgba(255,255,255,0.12)",
          borderRadius: "14px",
          color: value ? "#fff" : "rgba(255,255,255,0.55)",
          fontSize: "1.05rem",
          fontFamily: "Inter, sans-serif",
          cursor: "pointer",
          position: "relative",
          transition:
            "border-color .18s ease, box-shadow .18s ease, background .18s ease",
          boxShadow: open ? "0 0 0 3px rgba(250,204,21,0.12)" : "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#FACC15",
          }}
        >
          <Calendar size={20} />
        </span>

        <span>{prettyValue || "Selecciona una fecha"}</span>

        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            color: "rgba(255,255,255,0.55)",
            transition: "transform .18s ease",
          }}
        >
          <ChevronDown size={18} />
        </span>
      </button>

      {/* Panel inline (integrado) */}
      <div
        style={{
          marginTop: 12,
          borderRadius: 16,
          border: open
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid transparent",
          background: open ? "rgba(16,16,18,0.55)" : "transparent",
          overflow: "hidden",
          maxHeight: open ? 420 : 0,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-6px)",
          transition:
            "max-height .22s ease, opacity .18s ease, transform .18s ease, border-color .18s ease",
        }}
      >
        <div style={{ padding: open ? 12 : 0 }}>
          {open && (
            <div className="nf-inline-datepicker">
              <DatePicker
                inline
                selected={selectedDate}
                onChange={handleDateChange}
                locale="es"
                dateFormat="dd/MM/yyyy"
                maxDate={maxAllowedDate}
                fixedHeight

                renderCustomHeader={({
                  date,
                  changeYear,
                  changeMonth,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                }) => {
                  const currentMonth = date.getMonth();
                  const currentYear = date.getFullYear();

                  return (
                    <div className="nf-date-header">
                      <button
                        type="button"
                        className="nf-nav-btn"
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        aria-label="Mes anterior"
                      >
                        <span className="nf-chevron">‹</span>
                      </button>

                      <div className="nf-date-selects">
                        <select
                          className="nf-date-select"
                          value={currentMonth}
                          onChange={(e) => changeMonth(Number(e.target.value))}
                          aria-label="Seleccionar mes"
                        >
                          {months.map((m, idx) => (
                            <option key={m} value={idx}>
                              {m.toUpperCase()}
                            </option>
                          ))}
                        </select>

                        <select
                          className="nf-date-select"
                          value={currentYear}
                          onChange={(e) => changeYear(Number(e.target.value))}
                          aria-label="Seleccionar año"
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="nf-nav-btn"
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        aria-label="Mes siguiente"
                      >
                        <span className="nf-chevron">›</span>
                      </button>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
