import { useState } from "react";

const presets = [15, 30, 45, 60, 75, 90, 120];

export function customDurationMinutes(amount: string, unit: "minutes" | "hours") {
  const minutes = Number(amount) * (unit === "hours" ? 60 : 1);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : null;
}

export function AppointmentDurationField({ value, onChange, disabled = false }: {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"minutes" | "hours">("minutes");
  const minutes = customDurationMinutes(amount, unit);
  const options = [...new Set([...presets, value])].sort((left, right) => left - right);
  function apply() {
    if (minutes === null || disabled) return;
    onChange(minutes);
    setCustom(false);
  }

  return <div className="appointment-duration-field">
    <label><span>Duration</span><select disabled={disabled} value={custom ? "custom" : value} onChange={event => {
      if (event.target.value === "custom") {
        setAmount(String(value));
        setUnit("minutes");
        setCustom(true);
      } else {
        setCustom(false);
        onChange(Number(event.target.value));
      }
    }}>
      {options.map(option => <option key={option} value={option}>{option} min</option>)}
      <option value="custom">Custom…</option>
    </select></label>
    {custom && <fieldset disabled={disabled} onKeyDown={event => {
      if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
        event.preventDefault();
        apply();
      }
    }}>
      <legend>Custom duration</legend>
      <label><span>Amount</span><input autoFocus type="number" step="any" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label><span>Unit</span><select value={unit} onChange={event => setUnit(event.target.value === "hours" ? "hours" : "minutes")}>
        <option value="minutes">Minutes</option><option value="hours">Hours</option>
      </select></label>
      <small>{minutes === null ? "Enter a duration from 1 minute to 24 hours, in whole minutes." : `Apply ${minutes} minutes to update the end time.`}</small>
      <button type="button" onClick={() => setCustom(false)}>Cancel</button>
      <button type="button" disabled={minutes === null} onClick={apply}>Done</button>
    </fieldset>}
  </div>;
}
