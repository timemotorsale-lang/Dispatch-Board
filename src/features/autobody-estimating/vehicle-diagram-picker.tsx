"use client";

import { useEffect, useRef } from "react";
import { VEHICLE_GROUPS, vehicleGroup } from "@/lib/autobody-estimating/vehicle-groups";
import styles from "./workspace.module.css";

export function VehicleDiagramPicker({ open, currentGroup, onClose, onChoose }: {
  open: boolean; currentGroup: string; onClose: () => void;
  onChoose: (group: string, illustration: "vehicle-groups") => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), selector = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) { dialog.current?.showModal(); selector.current?.focus(); }
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  function closePicker() { dialog.current?.close(); onClose(); }
  return <dialog ref={dialog} className={styles.groupPicker} aria-labelledby="diagram-picker-heading" onCancel={event => { event.preventDefault(); closePicker(); }}>
    <header><h2 id="diagram-picker-heading">Vehicle diagrams &amp; components</h2><button type="button" onClick={closePicker} aria-label="Close vehicle group selector">Close</button></header>
    <label>Choose vehicle group<select ref={selector} defaultValue="" onChange={event => { if (!event.target.value) return; dialog.current?.close(); onChoose(event.target.value, "vehicle-groups"); }}>
      <option value="" disabled>Select a vehicle group</option>
      <optgroup label="Passenger & light-duty vehicles">{VEHICLE_GROUPS.filter(group => !["box-truck", "bus"].includes(group.id)).map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</optgroup>
      <optgroup label="Commercial vehicles">{VEHICLE_GROUPS.filter(group => ["box-truck", "bus"].includes(group.id)).map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</optgroup>
    </select></label>
    <p>Choose a group to open its diagrams and estimating tools.</p><p className={styles.generic}>Current group: {vehicleGroup(currentGroup).label}. Your vehicle, RO and estimate stay unchanged.</p>
  </dialog>;
}
