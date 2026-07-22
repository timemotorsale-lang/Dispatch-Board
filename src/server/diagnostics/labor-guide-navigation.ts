export type LaborGuideNavigationOperation = {
  id: string;
  title: string;
  aliases: string[];
  concernExamples: string[];
  initialTests: string[];
  likelyHours: number;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  skills: string[];
  tools: string[];
  verification: string[];
};

export type LaborGuideNavigationCategory = {
  id: string;
  title: string;
  description: string;
  operations: LaborGuideNavigationOperation[];
};

const op = (
  id: string,
  title: string,
  likelyHours: number,
  complexity: LaborGuideNavigationOperation["complexity"],
  aliases: string[],
  concernExamples: string[],
  initialTests: string[],
  skills: string[],
  tools: string[],
  verification: string[],
): LaborGuideNavigationOperation => ({ id, title, likelyHours, complexity, aliases, concernExamples, initialTests, skills, tools, verification });

export const LABOR_GUIDE_DIAGNOSTIC_NAVIGATION: LaborGuideNavigationCategory[] = [
  { id: "engine", title: "Engine Mechanical", description: "Internal engine condition, lubrication, timing, compression, and sealing.", operations: [
    op("engine-performance", "Engine mechanical condition diagnosis", 1.5, "HIGH", ["compression", "leak-down", "low power"], ["Low power", "Rough running", "Abnormal engine noise"], ["Relative compression", "Cylinder leakage", "Oil-pressure verification"], ["Advanced engine diagnosis"], ["Scan tool", "Compression tester", "Leak-down tester", "Oil-pressure gauge"], ["Confirmed mechanical integrity", "No abnormal leakage or pressure loss"]),
    op("timing-system", "Timing system diagnosis", 2.0, "HIGH", ["chain", "belt", "cam crank correlation"], ["Rattle on start", "Correlation fault", "No-start"], ["Cam/crank correlation", "Mechanical timing inspection", "Oil-control verification"], ["Engine performance specialist"], ["Oscilloscope", "Scan tool", "Timing tools"], ["Correlation restored", "No timing-related faults"]),
    op("lubrication", "Lubrication and oil-pressure diagnosis", 1.2, "HIGH", ["oil light", "low pressure", "consumption"], ["Oil warning", "Ticking", "Oil consumption"], ["Mechanical oil-pressure test", "Leak inspection", "Consumption baseline"], ["Engine diagnosis"], ["Oil-pressure gauge", "Inspection camera"], ["Pressure within specification", "Leak source documented"]),
  ]},
  { id: "starting-charging", title: "Starting & Charging", description: "Battery, cables, starter, alternator, and power-distribution faults.", operations: [
    op("no-crank", "No-crank / slow-crank diagnosis", 1.0, "MEDIUM", ["starter", "click", "slow crank"], ["No crank", "Intermittent click", "Slow cranking"], ["Battery conductance", "Voltage-drop test", "Starter command verification"], ["Electrical diagnosis"], ["DVOM", "Amp clamp", "Scan tool"], ["Consistent cranking speed", "Voltage drop within limit"]),
    op("charging", "Charging-system diagnosis", 1.0, "MEDIUM", ["alternator", "generator", "battery light"], ["Battery lamp", "Repeated dead battery", "Low system voltage"], ["Charging output", "Ripple test", "Network charging command"], ["Electrical diagnosis"], ["DVOM", "Amp clamp", "Scan tool"], ["Charging output verified", "Warning indicator cleared"]),
    op("parasitic-draw", "Parasitic battery draw diagnosis", 1.5, "HIGH", ["battery drain", "key-off draw", "sleep current"], ["Battery dies overnight", "Intermittent draw"], ["Sleep-cycle monitoring", "Voltage-drop fuse test", "Module wake-up isolation"], ["Advanced electrical diagnosis"], ["Low-current clamp", "DVOM", "Network scan tool"], ["Key-off draw within specification", "Wake source identified"]),
  ]},
  { id: "fuel-ignition", title: "Fuel, Air & Ignition", description: "Fuel delivery, ignition, air metering, misfire, and driveability.", operations: [
    op("no-start", "Crank/no-start diagnosis", 1.5, "HIGH", ["cranks no start", "fuel spark compression"], ["Engine cranks but will not start"], ["Network pre-scan", "Spark/fuel/injector pulse", "Relative compression", "Immobilizer status"], ["Advanced driveability diagnosis"], ["Scan tool", "Oscilloscope", "Fuel-pressure equipment"], ["Root cause proven", "Repeat starts verified"]),
    op("misfire", "Misfire diagnosis", 1.3, "HIGH", ["rough idle", "p0300", "miss"], ["Rough idle", "Flashing MIL", "Loss of power"], ["Misfire counters", "Ignition/fuel contribution", "Compression comparison"], ["Driveability diagnosis"], ["Scan tool", "Oscilloscope", "Pressure transducer"], ["Misfire eliminated", "Mode $06 within limits"]),
    op("fuel-delivery", "Fuel-delivery diagnosis", 1.2, "MEDIUM", ["low fuel pressure", "injector", "pump"], ["Long crank", "Lean condition", "Stall under load"], ["Low/high-side pressure", "Volume test", "Injector balance"], ["Fuel-system diagnosis"], ["Scan tool", "Fuel-pressure gauge"], ["Pressure and volume verified", "No fuel leaks"]),
    op("air-metering", "Air-metering and induction diagnosis", 1.0, "MEDIUM", ["maf", "vacuum leak", "boost leak"], ["Lean codes", "Low boost", "Unstable idle"], ["Fuel-trim analysis", "Smoke test", "Airflow plausibility"], ["Driveability diagnosis"], ["Smoke machine", "Scan tool"], ["Fuel trims normalized", "Induction sealed"]),
  ]},
  { id: "emissions", title: "Emissions & Exhaust", description: "Evaporative emissions, catalyst, oxygen sensing, and exhaust integrity.", operations: [
    op("evap", "EVAP system diagnosis", 1.2, "MEDIUM", ["fuel cap", "small leak", "purge"], ["EVAP warning", "Fuel odor", "Hard start after fueling"], ["Seal test", "Smoke test", "Purge/vent command"], ["Emissions diagnosis"], ["Smoke machine", "Scan tool"], ["Monitor-ready sealing verified", "No vapor leak"]),
    op("catalyst", "Catalyst efficiency diagnosis", 1.3, "HIGH", ["p0420", "converter", "oxygen sensor"], ["Catalyst code", "Loss of power", "Exhaust odor"], ["Upstream/downstream waveform", "Temperature comparison", "Restriction test"], ["Advanced emissions diagnosis"], ["Scan tool", "Oscilloscope", "Backpressure gauge"], ["Catalyst conclusion evidence-backed", "Related misfire/fuel faults excluded"]),
    op("exhaust-leak", "Exhaust leak and restriction diagnosis", 0.8, "MEDIUM", ["noise", "rattle", "backpressure"], ["Exhaust noise", "Rattle", "Low power"], ["Visual/smoke inspection", "Backpressure test", "Shield inspection"], ["General diagnosis"], ["Smoke machine", "Backpressure gauge"], ["Leak/restriction corrected", "Noise absent"]),
  ]},
  { id: "cooling", title: "Cooling System", description: "Overheating, coolant loss, temperature control, fans, and heat exchangers.", operations: [
    op("overheating", "Overheating diagnosis", 1.2, "HIGH", ["hot", "temperature", "head gasket"], ["Temperature warning", "Boil-over", "Overheats at idle"], ["Pressure test", "Thermal profile", "Fan command", "Combustion-gas screen"], ["Cooling-system diagnosis"], ["Pressure tester", "Scan tool", "Thermal camera"], ["Stable operating temperature", "No coolant loss"]),
    op("coolant-leak", "Coolant leak diagnosis", 0.8, "MEDIUM", ["low coolant", "antifreeze", "leak"], ["Coolant odor", "Puddle", "Repeated low level"], ["Cold/hot pressure test", "UV inspection", "Reservoir-cap test"], ["General diagnosis"], ["Pressure tester", "UV lamp"], ["System holds pressure", "Leak source documented"]),
    op("cooling-fan", "Cooling-fan control diagnosis", 1.0, "MEDIUM", ["fan", "relay", "module"], ["Overheats at idle", "Fan runs constantly", "A/C warm at stop"], ["Bidirectional fan command", "Power/ground test", "PWM/network verification"], ["Electrical diagnosis"], ["Scan tool", "DVOM", "Oscilloscope"], ["Fan stages operate correctly", "Control faults absent"]),
  ]},
  { id: "transmission", title: "Transmission & Drivetrain", description: "Automatic/manual transmission, transfer case, axles, differentials, and driveline.", operations: [
    op("shift-quality", "Transmission shift-quality diagnosis", 1.5, "HIGH", ["slip", "harsh shift", "delayed engagement"], ["Harsh shift", "Slipping", "Delayed engagement"], ["Fluid condition", "Adaptives and pressures", "Road-test capture"], ["Transmission diagnosis"], ["Factory-level scan tool", "Pressure gauge"], ["Shift concern reproduced and classified", "Post-repair adaptives verified"]),
    op("driveline-vibration", "Driveline vibration diagnosis", 1.5, "HIGH", ["driveshaft", "u-joint", "differential"], ["Speed-related vibration", "Clunk", "Whine"], ["Frequency analysis", "Runout/angle measurement", "Loaded road test"], ["NVH/driveline diagnosis"], ["Chassis ears", "Vibration analyzer", "Angle gauge"], ["Source isolated", "Road-test verification complete"]),
    op("awd-4wd", "AWD / 4WD system diagnosis", 1.4, "HIGH", ["transfer case", "4x4", "coupling"], ["Will not engage", "Binding", "Warning message"], ["Network scan", "Tire circumference", "Actuator command", "Fluid inspection"], ["Drivetrain diagnosis"], ["Scan tool", "DVOM"], ["Mode engagement verified", "No binding or warning"]),
  ]},
  { id: "brakes", title: "Brakes, ABS & Stability", description: "Hydraulic brakes, friction, ABS, stability control, and electronic parking brake.", operations: [
    op("brake-performance", "Brake performance diagnosis", 1.0, "HIGH", ["pull", "soft pedal", "grind"], ["Pull while braking", "Soft pedal", "Grinding"], ["Road test", "Friction/hydraulic inspection", "Rotor runout", "Fluid condition"], ["Brake diagnosis"], ["Dial indicator", "Pressure gauges", "Scan tool"], ["Stopping performance verified", "No leaks or abnormal noise"]),
    op("abs", "ABS / stability-control diagnosis", 1.3, "HIGH", ["traction", "wheel speed", "abs light"], ["ABS lamp", "Unexpected activation", "Stability warning"], ["Network scan", "Wheel-speed comparison", "Circuit/sensor scope test"], ["Advanced chassis electrical diagnosis"], ["Scan tool", "Oscilloscope", "DVOM"], ["Wheel-speed signals plausible", "ABS self-test passes"]),
    op("parking-brake", "Electronic parking-brake diagnosis", 1.0, "MEDIUM", ["epb", "parking brake", "service mode"], ["Parking brake inoperative", "Will not release"], ["Network scan", "Actuator command", "Power/ground/load test"], ["Brake electrical diagnosis"], ["Scan tool", "DVOM"], ["Apply/release verified", "No EPB faults"]),
  ]},
  { id: "steering-suspension", title: "Steering & Suspension", description: "Steering assist, alignment, ride control, wheel bearings, and chassis noises.", operations: [
    op("steering", "Steering concern diagnosis", 1.1, "HIGH", ["pull", "wander", "eps", "hard steering"], ["Steering pull", "Wander", "Loss of assist"], ["Steering-angle data", "Mechanical inspection", "Alignment precheck", "Assist command"], ["Chassis diagnosis"], ["Alignment equipment", "Scan tool"], ["Steering centered and stable", "Assist faults absent"]),
    op("suspension-noise", "Suspension noise diagnosis", 1.0, "MEDIUM", ["clunk", "rattle", "squeak"], ["Clunk over bumps", "Squeak", "Loose feeling"], ["Loaded inspection", "Chassis-ear road test", "Bushing/joint check"], ["Chassis diagnosis"], ["Chassis ears", "Play detector"], ["Noise source confirmed", "Fastener torque verified"]),
    op("ride-control", "Electronic ride-control diagnosis", 1.4, "HIGH", ["air suspension", "adaptive damper", "ride height"], ["Vehicle low", "Harsh ride", "Suspension warning"], ["Ride-height data", "Leak test", "Actuator command", "Network scan"], ["Advanced chassis diagnosis"], ["Scan tool", "Leak detector"], ["Ride height stable", "Calibration and faults verified"]),
  ]},
  { id: "tires", title: "Wheels, Tires & TPMS", description: "Tire wear, balance, wheel runout, TPMS, and alignment-related concerns.", operations: [
    op("tire-vibration", "Wheel and tire vibration diagnosis", 1.0, "MEDIUM", ["balance", "road force", "shake"], ["Highway-speed shake", "Seat vibration"], ["Road-force measurement", "Runout", "Wheel centering", "Frequency analysis"], ["Tire/chassis diagnosis"], ["Road-force balancer", "Dial indicator"], ["Road-force within limit", "Vibration absent on verification drive"]),
    op("tpms", "TPMS diagnosis", 0.8, "LOW", ["tire light", "sensor", "relearn"], ["TPMS lamp", "Missing pressure reading"], ["Sensor activation", "Module data", "Relearn status"], ["General electrical diagnosis"], ["TPMS activation tool", "Scan tool"], ["All sensors report", "Relearn complete"]),
  ]},
  { id: "electrical-network", title: "Electrical, Modules & Networks", description: "Power distribution, wiring, grounds, CAN/LIN networks, modules, programming, and accessories.", operations: [
    op("network", "Vehicle network / communication diagnosis", 1.8, "HIGH", ["can bus", "no communication", "u code"], ["Multiple warning lamps", "No module communication", "Intermittent electrical faults"], ["Topology scan", "Bus resistance/voltage", "Waveform integrity", "Module isolation"], ["Master electrical/network diagnosis"], ["OEM-level scan tool", "Oscilloscope", "Breakout leads"], ["Network topology restored", "All required modules communicate"]),
    op("power-ground", "Power, ground, and circuit diagnosis", 1.0, "MEDIUM", ["fuse", "relay", "wiring", "short"], ["Inoperative component", "Blown fuse", "Intermittent circuit"], ["Load test", "Voltage drop", "Short/open isolation"], ["Electrical diagnosis"], ["DVOM", "Load probe", "Current clamp"], ["Circuit operates under load", "Protection device remains intact"]),
    op("module-programming", "Module setup / programming diagnosis", 1.2, "HIGH", ["flash", "coding", "configuration"], ["Programming failure", "Replacement module not configured"], ["Battery support", "Software/applicability verification", "Network health precheck"], ["Programming-qualified technician"], ["OEM interface", "Battery maintainer", "Scan tool"], ["Programming record captured", "Configuration and DTC scan verified"]),
  ]},
  { id: "hvac", title: "HVAC & Climate Control", description: "Heating, cooling, refrigerant, airflow, actuators, and automatic climate control.", operations: [
    op("ac-performance", "A/C performance diagnosis", 1.1, "MEDIUM", ["warm air", "refrigerant", "compressor"], ["A/C not cold", "Intermittent cooling", "Compressor noise"], ["Temperature/pressure performance", "Leak detection", "Command/state analysis"], ["HVAC diagnosis"], ["Recovery machine", "Leak detector", "Scan tool"], ["Vent temperature and pressures verified", "Leak status documented"]),
    op("hvac-airflow", "HVAC airflow / temperature-door diagnosis", 1.0, "MEDIUM", ["blend door", "blower", "mode door"], ["Wrong vent", "Uneven temperature", "No airflow"], ["Actuator calibration", "Command/feedback", "Blower circuit test"], ["HVAC electrical diagnosis"], ["Scan tool", "DVOM", "Borescope"], ["Mode and temperature response verified", "Calibration complete"]),
    op("heater", "Heating-system diagnosis", 1.0, "MEDIUM", ["no heat", "heater core", "coolant flow"], ["No cabin heat", "Heat fades at idle"], ["Coolant temperature comparison", "Flow/restriction check", "Air-mix verification"], ["HVAC/cooling diagnosis"], ["Thermal camera", "Scan tool"], ["Stable heater output", "Cooling system remains sealed"]),
  ]},
  { id: "body-safety", title: "Body, Interior & Safety Restraints", description: "Doors, windows, locks, lighting, water leaks, SRS, seats, and interior electronics.", operations: [
    op("srs", "SRS / airbag diagnosis", 1.3, "HIGH", ["airbag light", "occupant sensor", "pretensioner"], ["Airbag warning", "Occupant classification fault"], ["SRS scan", "Connector/circuit inspection", "Seat/occupant data"], ["SRS-qualified technician"], ["OEM-level scan tool", "Approved simulators"], ["SRS self-test passes", "No unsafe bypasses"]),
    op("body-accessory", "Body electrical accessory diagnosis", 1.0, "MEDIUM", ["window", "lock", "mirror", "lighting"], ["Window inoperative", "Door will not lock", "Lighting fault"], ["Module scan", "Switch/command data", "Circuit load test"], ["Body electrical diagnosis"], ["Scan tool", "DVOM"], ["Accessory operates in all modes", "Pinch/safety functions verified"]),
    op("water-leak", "Water leak / wind noise diagnosis", 1.5, "HIGH", ["rain leak", "whistle", "sunroof drain"], ["Wet carpet", "Wind whistle", "Water intrusion"], ["Controlled water test", "Smoke/ultrasonic test", "Drain and seam inspection"], ["Body diagnosis"], ["Leak-detection equipment", "Borescope"], ["No intrusion under controlled test", "Interior dried and protected"]),
  ]},
  { id: "adas", title: "ADAS & Driver Assistance", description: "Camera, radar, ultrasonic, blind-spot, lane, cruise, parking, and calibration systems.", operations: [
    op("adas-warning", "ADAS warning / performance diagnosis", 1.5, "HIGH", ["lane", "radar", "camera", "blind spot"], ["ADAS unavailable", "False alerts", "Feature inoperative"], ["Full network scan", "Mounting/aim inspection", "Environmental and calibration status"], ["ADAS-qualified diagnosis"], ["OEM-level scan tool", "Alignment check", "Calibration equipment"], ["Feature operation verified", "Calibration evidence retained"]),
    op("adas-calibration", "ADAS calibration planning and verification", 1.5, "HIGH", ["static calibration", "dynamic calibration", "target"], ["Calibration required after repair", "Calibration will not complete"], ["Prerequisite audit", "Target/environment setup", "Dynamic-route validation"], ["ADAS-qualified technician"], ["Calibration frame/targets", "OEM-level scan tool"], ["Calibration completion documented", "Post-scan clean"]),
  ]},
  { id: "hybrid-ev", title: "Hybrid, EV & High Voltage", description: "High-voltage battery, inverter, drive unit, charging, thermal management, and isolation.", operations: [
    op("hv-safety", "High-voltage safety and isolation diagnosis", 2.0, "HIGH", ["isolation fault", "service disconnect", "high voltage"], ["High-voltage warning", "Vehicle will not ready"], ["Qualified visual inspection", "Isolation data", "Safe disable/verify procedure"], ["High-voltage qualified technician"], ["CAT III/IV meter", "HV PPE", "OEM-level scan tool"], ["Safe state documented", "Isolation result evidence retained"]),
    op("ev-charging", "EV charging diagnosis", 1.5, "HIGH", ["will not charge", "evse", "onboard charger"], ["Charging interrupted", "Will not charge", "Reduced charge rate"], ["EVSE comparison", "Pilot/proximity data", "Thermal and onboard-charger scan"], ["EV charging diagnosis"], ["EVSE tester", "OEM-level scan tool", "HV PPE"], ["AC/DC charging verified as applicable", "No isolation or thermal fault"]),
    op("hv-thermal", "High-voltage thermal-management diagnosis", 1.8, "HIGH", ["battery cooling", "chiller", "heat pump"], ["Reduced power", "Charging derate", "Thermal warning"], ["Temperature plausibility", "Pump/valve command", "Refrigerant/coolant circuit evaluation"], ["HV thermal diagnosis"], ["Scan tool", "Thermal camera", "HVAC equipment"], ["Thermal regulation verified", "No leaks or derates"]),
  ]},
  { id: "diesel", title: "Diesel, Turbo & Aftertreatment", description: "Common-rail fuel, turbocharging, EGR, DPF, SCR/DEF, and diesel starting.", operations: [
    op("diesel-no-start", "Diesel crank/no-start diagnosis", 1.8, "HIGH", ["rail pressure", "glow plug", "injector return"], ["Long crank", "No start", "Cold-start difficulty"], ["Cranking rail pressure", "Injector return", "Glow system", "Compression/synchronization"], ["Diesel diagnosis"], ["OEM-level scan tool", "Fuel test equipment", "Amp clamp"], ["Repeat starts verified", "Rail-pressure build proven"]),
    op("dpf-scr", "DPF / SCR / DEF diagnosis", 1.8, "HIGH", ["regen", "def", "nox", "soot"], ["Derate warning", "Regen frequency", "DEF quality message"], ["Aftertreatment scan", "Pressure/temperature plausibility", "DEF quality/dosing", "NOx comparison"], ["Diesel aftertreatment diagnosis"], ["OEM-level scan tool", "DEF refractometer", "Pressure test equipment"], ["Regeneration/dosing verified", "Derate conditions cleared lawfully"]),
    op("turbo-diesel", "Turbocharger / boost diagnosis", 1.5, "HIGH", ["underboost", "overboost", "vgt"], ["Low power", "Whistle", "Boost fault"], ["Charge-air leak test", "Desired/actual boost", "VGT actuator and exhaust restriction"], ["Diesel performance diagnosis"], ["Smoke machine", "Scan tool", "Vacuum/pressure tools"], ["Boost tracks command", "Charge-air system sealed"]),
  ]},
  { id: "nvh", title: "Noise, Vibration & Harshness", description: "Frequency-based diagnosis of noises, vibrations, rattles, and ride concerns.", operations: [
    op("nvh-general", "NVH source-isolation diagnosis", 1.5, "HIGH", ["buzz", "rattle", "hum", "vibration"], ["Speed-related vibration", "Engine-order vibration", "Intermittent rattle"], ["Customer-condition reproduction", "Frequency/order analysis", "Chassis-ear isolation"], ["NVH specialist"], ["Vibration analyzer", "Chassis ears", "Road-test recorder"], ["Source isolated with evidence", "Verification route repeated"]),
  ]},
  { id: "maintenance", title: "Maintenance & General Inspection", description: "Warning lamps, fluid leaks, scheduled maintenance, pre-purchase, and multi-point concerns.", operations: [
    op("warning-lamp", "Warning lamp / message initial diagnosis", 0.8, "MEDIUM", ["check engine", "warning message", "service light"], ["Warning lamp illuminated", "Intermittent message"], ["Complete module scan", "Freeze-frame review", "Visual safety screening"], ["General diagnosis"], ["Scan tool", "DVOM"], ["Fault scope established", "Urgency and next test documented"]),
    op("fluid-leak", "Fluid leak source diagnosis", 0.8, "MEDIUM", ["oil leak", "fluid puddle", "odor"], ["Puddle", "Burning odor", "Low fluid"], ["Fluid identification", "Clean/dye and trace", "System-level inspection"], ["General diagnosis"], ["UV dye", "Inspection light"], ["Source and severity documented", "Post-clean verification complete"]),
    op("multipoint", "Comprehensive diagnostic inspection", 1.5, "MEDIUM", ["pre purchase", "multiple concerns", "inspection"], ["Multiple unrelated concerns", "Vehicle condition assessment"], ["Safety inspection", "Full scan", "Road test", "Fluid and maintenance review"], ["Master/general technician"], ["Scan tool", "Lift", "Inspection equipment"], ["Findings prioritized", "Evidence attached to every recommendation"]),
  ]},
  { id: "collision", title: "Collision, Body & Refinish", description: "Damage analysis, structural measurement, refinishing, glass, and post-collision electronics.", operations: [
    op("collision-damage", "Collision damage analysis", 1.5, "HIGH", ["estimate", "hidden damage", "impact"], ["Visible impact damage", "Panel misalignment"], ["Photo map", "Pre-scan", "Structural and adjacent-part inspection"], ["Collision estimator/body technician"], ["Measuring system", "Scan tool", "Damage-imaging tools"], ["Damage map complete", "Supplement risks documented"]),
    op("structural", "Structural / frame diagnosis and measurement", 2.0, "HIGH", ["frame", "unibody", "datum"], ["Alignment after impact", "Uneven gaps", "Suspension setback"], ["Datum measurement", "Suspension pickup-point comparison", "OEM repairability review"], ["Structural repair specialist"], ["Electronic measuring system", "Frame equipment"], ["Measurements documented", "Repairability decision approved"]),
    op("refinish", "Refinish and color-match planning", 1.5, "HIGH", ["paint", "blend", "tri coat"], ["Color mismatch", "Refinish after panel repair"], ["Color variant", "Spray-out", "Blend-panel and material assessment"], ["Refinish specialist"], ["Paint system", "Spectrophotometer", "Spray-out cards"], ["Color/texture match verified", "Material and blend scope documented"]),
  ]},
];

