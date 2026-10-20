export type CatalogRequirements = {
  requiredSkills: string[];
  requiredCertifications: string[];
  bayRequirements: string[];
  toolRequirements: string[];
};

const subsystemChecks: Record<string, string> = {
  "maintenance-sample": "oil specification, filter application, service interval and leak check",
  "maintenance-fluids": "identified fluid circuit, specified fluid, measured capacity and level procedure",
  "maintenance-inspections": "inspection checklist, measured limits and documented findings",
  "maintenance-belts": "belt routing, tensioning method, driven accessories and running inspection",
  "maintenance-service": "manufacturer schedule, severe-use conditions and itemized package contents",
  "engine-assembly": "engine code, supplied assembly contents, lifting/support points and commissioning",
  "engine-head": "bank, valvetrain design, fastener reuse rules, sealing surfaces and timing verification",
  "engine-bottom": "block/crankshaft identification, measured clearances, machining boundary and oil pressure",
  "engine-timing": "belt/chain design, locking tools, timing marks and interference-engine verification",
  "engine-lubrication": "oil circuit, pressure specification, pickup/seal condition and leak verification",
  "engine-cooling": "cooling circuit, pressure limit, fill/bleed procedure and temperature verification",
  "engine-air": "intake configuration, air-leak testing and measured airflow response",
  "engine-fuel": "fuel type, pressure release, circuit cleanliness and pressure/leak verification",
  "engine-sample": "cylinder identification, fault evidence, ignition design and misfire verification",
  "engine-boost": "boost configuration, oil/coolant connections, actuator setup and pressure verification",
  "engine-diesel": "injection architecture, high-pressure isolation, contamination control and coding",
  "engine-controls": "engine/software identification, circuit tests and required learning procedures",
  "engine-ventilation": "ventilation routing, diaphragm/check-valve configuration and crankcase pressure",
  "engine-commissioning": "pre-start lubrication, adaptations, monitored startup and acceptance limits",
  "transmission-sample": "gearbox code, supplied assembly contents, fluid specification and engagement checks",
  "transmission-cvt": "CVT/DCT identification, internal-service boundary, adaptations and ratio verification",
  "transmission-manual": "gearbox/clutch design, supplied kit contents, release adjustment and shift checks",
  "transmission-transfer": "transfer/PTU identification, drive ratios, fluid and engagement checks",
  "transmission-differential": "axle ratio, bearing preload, backlash, contact pattern and leak checks",
  "transmission-shafts": "axle/side, shaft length, balance/indexing and joint/fastener verification",
  "transmission-controls": "control software, coding prerequisites and measured adaptation results",
  "transmission-verification": "fluid temperature, drive ratios, safe test conditions and acceptance limits",
  "tires-sample": "tire/load specification, repairability, mounting method and balance verification",
  "tires-hubs": "axle/side, hub/bearing design, press tooling and torque/end-play verification",
  "tires-tpms": "sensor protocol, valve contents, relearn procedure and pressure verification",
  "tires-rims": "wheel dimensions/load rating, damage assessment and runout/fastener checks",
  "electrical-sample": "low-voltage architecture, battery support, starter draw and charge output",
  "electrical-distribution": "fuse/relay rating, circuit protection, voltage drop and load verification",
  "electrical-network": "network topology, module/software identity, coding and communication checks",
  "electrical-lighting": "lamp technology, aiming requirements and lighting-function checks",
  "electrical-security": "authorized access, key/module compatibility and immobilizer verification",
  "electrical-instruments": "cluster/driver information configuration, coding and display verification",
  "electrical-trailer": "tow-vehicle connector/pinout, load protection and trailer-light simulation",
  "electrical-waveform": "circuit reference, test-point limits, waveform capture and intermittent-fault evidence",
  "hvac-sample": "air-distribution configuration, cabin airflow and measured outlet temperature",
  "hvac-refrigerant": "refrigerant identity, recovery capability, specified charge and leak verification",
  "hvac-heat": "heater circuit, coolant specification, safe bleed and heat-output verification",
  "hvac-controls": "actuator/sensor identification, calibration and commanded-response checks",
  "hvac-drains": "drain routing, water-leak source, cleaning compatibility and drainage verification",
  "hvac-heatpump": "HV/refrigerant circuit identification, isolation, charging and thermal-mode verification",
  "exhaust-sample": "emissions configuration, sensor position, fault evidence and monitored response",
  "exhaust-hardware": "bank/section, heat protection, fastener condition and exhaust-leak checks",
  "exhaust-catalyst": "approved application, bank, contamination cause and efficiency verification",
  "exhaust-evap": "vapor circuit, approved test pressure, valve operation and leak-test results",
  "exhaust-egr": "EGR architecture, cooler circuit, contamination and commanded-flow verification",
  "exhaust-diesel": "aftertreatment configuration, regeneration prerequisites, DEF quality and thermal limits",
  "safety-sample": "sensor position, mounting, manufacturer calibration prerequisites and recorded results",
  "safety-srs": "restraint configuration, deactivation procedure, single-use parts and post-repair scan",
  "safety-belts": "seating position, pretensioner architecture, supplied contents and restraint verification",
  "safety-braking": "driver-assistance braking configuration, calibration and controlled verification",
  "safety-verification": "calibration environment, targets, prerequisites and retained result report",
  "body-sample": "opening/side, regulator/latch design, pinch protection and function verification",
  "body-glass": "glass application, bonding/curing specification, sensor exposure and water-leak verification",
  "body-wipers": "front/rear position, linkage indexing, washer routing and wipe-pattern verification",
  "body-seats": "seating position, restraint wiring, occupant-sensor calibration and travel checks",
  "body-roof": "roof design, drain routing, indexing and controlled leak/operation tests",
  "body-closures": "closure type, support method, latch adjustment and anti-pinch checks",
  "body-infotainment": "equipment/software identity, security access, coding and function verification",
  "body-trim": "trim/side, concealed fasteners, sensor wiring and attachment verification",
  "body-water": "documented leak source, controlled water testing and retained repair evidence",
  "body-collision": "structural/refinish scope, manufacturer repair limits and specialist referral boundary",
  "ev-battery": "battery/platform identity, damage assessment, isolation and commissioning report",
  "ev-drive": "front/rear unit, integrated components, HV isolation and propulsion verification",
  "ev-charge-hardware": "connector/charging architecture, HV isolation and charging-function verification",
  "ev-sample": "thermal circuit, specified coolant, isolation boundary and thermal-mode checks",
  "ev-hybrid": "hybrid platform, coupled drivetrain, HV isolation and hybrid-mode verification",
  "ev-service": "platform-specific isolation/restoration, protective equipment and retained isolation evidence",
  "ev-verification": "battery/charge/drive acceptance limits, documented platform-specific results"
};

export function lightDutyScopeProfile(systemId: string, groupId: string, label: string, diagnosis: boolean) {
  const checks = subsystemChecks[groupId];
  if (!checks) throw new Error(`Missing catalog subsystem profile: ${groupId}`);
  const requirements: CatalogRequirements = {
    requiredSkills: [`CATALOG_${systemId.toUpperCase()}`],
    requiredCertifications: [], bayRequirements: [], toolRequirements: ["SERVICE_INFORMATION"]
  };
  if (systemId === "ev" || groupId === "hvac-heatpump" || /high.voltage|electric compressor/i.test(label)) {
    requirements.requiredCertifications.push("HV_PLATFORM_QUALIFIED");
    requirements.toolRequirements.push("HV_ISOLATION_EQUIPMENT");
    requirements.bayRequirements.push("HV_CONTROLLED_AREA");
  }
  if (["hvac-refrigerant", "hvac-heatpump"].includes(groupId)) {
    requirements.requiredCertifications.push("REFRIGERANT_SERVICE");
    requirements.toolRequirements.push("REFRIGERANT_SERVICE_EQUIPMENT");
  }
  if (systemId === "safety") {
    requirements.requiredCertifications.push(groupId === "safety-srs" || groupId === "safety-belts" ? "RESTRAINT_SYSTEMS" : "ADAS_PLATFORM_QUALIFIED");
    requirements.toolRequirements.push(groupId === "safety-srs" || groupId === "safety-belts" ? "RESTRAINT_SERVICE_EQUIPMENT" : "ADAS_CALIBRATION_EQUIPMENT");
  }
  if (groupId === "body-collision" || /structural|refinish/i.test(label)) {
    requirements.requiredCertifications.push("BODY_REPAIR_SPECIALIST");
    requirements.bayRequirements.push("BODY_REPAIR_AREA");
  }
  if (["engine-assembly", "transmission-sample", "transmission-cvt", "transmission-manual"].includes(groupId) && !diagnosis) requirements.toolRequirements.push("POWERTRAIN_SUPPORT_EQUIPMENT");
  return {
    configurationFields: checks.split(", "), requirements,
    included: diagnosis
      ? [`Document ${label.toLowerCase()} findings against ${checks}`, "Only the selected test is authorized; replacement requires separately reviewed scope"]
      : [`Identify the selected unit and verify ${checks}`, `${label}; include access and restoration for that unit only`],
    excluded: [`Unreviewed variants, additional units and unlisted specialist work in ${groupId}`, "Included package access cannot also be billed as standalone labor"],
    verification: [`Record vehicle-specific limits and measured results for ${checks}`, "Retain procedure revision, reviewer and post-work evidence; unresolved results require hold or referral"],
    conditional: [`Resolve ${checks} before presentation and execution`, "Equipment and qualification codes are internal requirements, not a claim of external certification"]
  };
}
