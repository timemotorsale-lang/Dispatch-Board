import Link from "next/link";

export default function VehicleNotFound() {
  return (
    <section className="page-stack">
      <header className="page-copy">
        <h1>Vehicle not found</h1>
        <p>This vehicle record is unavailable. Search the vehicle registry by VIN or stock number.</p>
        <Link className="button button-primary" href="/vehicles/registry">
          Find a vehicle
        </Link>
      </header>
    </section>
  );
}
