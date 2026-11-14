import { appointmentPurposeGroup, appointmentPurposeGroups, type AppointmentPurpose } from "./appointment-purposes";

export function AppointmentPurposeFields({ purpose, onChange }: {
  purpose: AppointmentPurpose;
  onChange: (purpose: AppointmentPurpose) => void;
}) {
  const group = appointmentPurposeGroup(purpose.category, purpose.value);
  return <>
    <label><span>Category</span>
      <select value={group.id} onChange={event => {
        const next = appointmentPurposeGroups.find(item => item.id === event.target.value);
        if (next) onChange(next.options[0]);
      }}>
        {appointmentPurposeGroups.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label><span>Purpose</span>
      <select value={purpose.value} onChange={event => {
        const next = group.options.find(item => item.value === event.target.value);
        if (next) onChange(next);
      }}>
        {group.options.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  </>;
}
