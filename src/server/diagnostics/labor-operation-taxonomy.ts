export type LaborRepairOperation = {
  aliases: string[];
  component: string;
  concernExamples: string[];
  hours: number;
  id: string;
  included: string[];
  operation: "Replace" | "Repair" | "Inspect" | "Diagnose" | "Adjust" | "Measure" | "Program / Calibrate" | "Service";
  overlapGroup: string | null;
  position: string;
  requiredAddOns: string[];
  subsystem: string;
  system: string;
  title: string;
};

export type LaborOperationGroup = {
  id: string;
  title: string;
  operations: LaborRepairOperation[];
};

export type LaborOperationSystem = {
  description: string;
  groups: LaborOperationGroup[];
  id: string;
  title: string;
};

const labor = (
  id: string,
  system: string,
  subsystem: string,
  component: string,
  operation: LaborRepairOperation["operation"],
  position: string,
  title: string,
  hours: number,
  aliases: string[],
  concernExamples: string[],
  included: string[] = ["Vehicle-appropriate access", "Remove and install", "Basic verification"],
  requiredAddOns: string[] = [],
  overlapGroup: string | null = null,
): LaborRepairOperation => ({ aliases, component, concernExamples, hours, id, included, operation, overlapGroup, position, requiredAddOns, subsystem, system, title });

export const LABOR_OPERATION_TAXONOMY: LaborOperationSystem[] = [
  { id: "maintenance", title: "Maintenance & Scheduled Service", description: "Routine service, fluids, filters, belts, tune-up work, and mileage-based packages.", groups: [
    { id: "oil-fluids", title: "Oil, Fluids & Filters", operations: [
      labor("engine-oil-service", "Maintenance & Scheduled Service", "Oil, Fluids & Filters", "Engine Oil & Filter", "Service", "Engine Bay", "Engine oil and filter service", 0.5, ["oil change", "lube service"], ["Maintenance due", "Oil life warning"], ["Drain and fill oil", "Replace filter", "Reset maintenance reminder"], [], "maintenance-service"),
      labor("transmission-fluid-service", "Maintenance & Scheduled Service", "Oil, Fluids & Filters", "Transmission Fluid", "Service", "Vehicle", "Automatic transmission fluid service", 1.4, ["transmission service", "atf"], ["Scheduled maintenance", "Fluid dark"], ["Service fluid", "Inspect pan/leaks", "Verify level"], [], "fluid-service"),
      labor("brake-fluid-service", "Maintenance & Scheduled Service", "Oil, Fluids & Filters", "Brake Fluid", "Service", "Vehicle", "Brake fluid exchange", 1.0, ["brake flush", "brake fluid"], ["Dark brake fluid", "Maintenance due"], ["Exchange fluid", "Bleed system", "Verify pedal"], [], "fluid-service"),
      labor("coolant-service", "Maintenance & Scheduled Service", "Oil, Fluids & Filters", "Coolant", "Service", "Vehicle", "Cooling system fluid exchange", 1.2, ["coolant flush", "antifreeze"], ["Coolant service due", "Coolant condition poor"], ["Exchange coolant", "Bleed air", "Check leaks"], [], "fluid-service"),
    ] },
    { id: "filters-belts-plugs", title: "Filters, Belts & Tune-Up", operations: [
      labor("engine-air-filter", "Maintenance & Scheduled Service", "Filters, Belts & Tune-Up", "Engine Air Filter", "Replace", "Engine Bay", "Replace engine air filter", 0.2, ["air filter"], ["Dirty air filter", "Maintenance due"]),
      labor("cabin-air-filter", "Maintenance & Scheduled Service", "Filters, Belts & Tune-Up", "Cabin Air Filter", "Replace", "Cabin", "Replace cabin air filter", 0.3, ["cabin filter"], ["Weak airflow", "Odor from vents"]),
      labor("serpentine-belt", "Maintenance & Scheduled Service", "Filters, Belts & Tune-Up", "Serpentine Belt", "Replace", "Engine Bay", "Replace serpentine drive belt", 0.8, ["drive belt", "serp belt"], ["Belt squeal", "Cracked belt"], ["Remove belt", "Inspect pulleys", "Install belt"], [], "front-accessory-drive"),
      labor("spark-plugs", "Maintenance & Scheduled Service", "Filters, Belts & Tune-Up", "Spark Plugs", "Replace", "Engine", "Replace spark plugs", 1.8, ["plugs", "tune up"], ["Misfire", "Tune-up due"], ["Replace plugs", "Inspect coils/boots", "Clear codes as applicable"], [], "ignition-access"),
    ] },
  ] },
  { id: "brakes", title: "Brakes, ABS & Stability", description: "Friction brakes, hydraulics, ABS, stability control, and electronic parking brake labor.", groups: [
    { id: "friction-brakes", title: "Pads, Rotors, Drums & Calipers", operations: [
      labor("front-brake-pads-rotors", "Brakes, ABS & Stability", "Front Brakes", "Pads & Rotors", "Replace", "Front Both", "Replace front brake pads and rotors", 2.1, ["front brakes", "brake pads", "rotors", "grinding"], ["Grinding when braking", "Brake pulsation"], ["Replace pads", "Replace rotors", "Clean and lube hardware"], [], "front-brakes"),
      labor("rear-brake-pads-rotors", "Brakes, ABS & Stability", "Rear Brakes", "Pads & Rotors", "Replace", "Rear Both", "Replace rear brake pads and rotors", 2.0, ["rear brakes", "rear pads", "rear rotors"], ["Rear brake grinding", "Parking brake drag"], ["Replace pads", "Replace rotors", "Service hardware"], [], "rear-brakes"),
      labor("brake-caliper-front", "Brakes, ABS & Stability", "Front Brakes", "Caliper", "Replace", "Front", "Replace front brake caliper", 1.2, ["caliper", "sticking brake"], ["Brake pull", "Caliper seized"], ["Replace caliper", "Bleed affected circuit", "Leak check"], ["brake-fluid-service"], "front-brakes"),
      labor("brake-master-cylinder", "Brakes, ABS & Stability", "Hydraulic Brakes", "Master Cylinder", "Replace", "Engine Bay", "Replace brake master cylinder", 1.8, ["master cylinder", "soft pedal"], ["Soft pedal", "Internal bypass"], ["Bench bleed", "Install", "System bleed"], ["brake-fluid-service"], "brake-hydraulics"),
    ] },
    { id: "abs-epb", title: "ABS, Stability & Parking Brake", operations: [
      labor("wheel-speed-sensor", "Brakes, ABS & Stability", "ABS", "Wheel Speed Sensor", "Replace", "Wheel Specific", "Replace wheel speed sensor", 0.9, ["abs sensor", "wheel speed"], ["ABS light", "Traction control light"], ["Replace sensor", "Route harness", "Verify signal"]),
      labor("abs-hydraulic-unit", "Brakes, ABS & Stability", "ABS", "Hydraulic Control Unit", "Replace", "Engine Bay", "Replace ABS hydraulic control unit", 2.8, ["abs module", "hcu"], ["ABS module fault", "Pump motor fault"], ["Replace unit", "Bleed ABS system", "Initialize module"], ["brake-fluid-service"], "brake-hydraulics"),
      labor("electronic-parking-brake-service", "Brakes, ABS & Stability", "Parking Brake", "EPB Actuator", "Service", "Rear", "Electronic parking brake service mode and repair", 0.8, ["epb", "parking brake service"], ["Parking brake stuck", "Rear brake service"], ["Enter service mode", "Service actuator", "Calibrate"], [], "rear-brakes"),
    ] },
  ] },
  { id: "steering-suspension", title: "Steering & Suspension", description: "Ride, handling, steering assist, alignment, bushings, struts, shocks, arms, and bearings.", groups: [
    { id: "front-suspension", title: "Front Suspension", operations: [
      labor("front-right-lower-control-arm", "Steering & Suspension", "Front Suspension", "Lower Control Arm", "Replace", "Front Right", "Replace front right lower control arm", 2.4, ["control arm", "lower arm", "front end clunk"], ["Clunking noise over bumps", "Loose front wheel feel"], ["Replace control arm", "Torque at ride height", "Inspect ball joint"], ["alignment"], "front-suspension"),
      labor("front-left-lower-control-arm", "Steering & Suspension", "Front Suspension", "Lower Control Arm", "Replace", "Front Left", "Replace front left lower control arm", 2.4, ["control arm", "lower arm"], ["Clunking noise over bumps", "Uneven tire wear"], ["Replace control arm", "Torque at ride height", "Inspect ball joint"], ["alignment"], "front-suspension"),
      labor("front-strut-assembly", "Steering & Suspension", "Front Suspension", "Strut Assembly", "Replace", "Front Both", "Replace front strut assemblies - both sides", 3.4, ["strut", "front struts", "front suspension bounce"], ["Front bounce", "Strut leaking"], ["Replace struts", "Transfer mounts if applicable", "Road test"], ["alignment"], "front-suspension"),
      labor("front-ball-joint", "Steering & Suspension", "Front Suspension", "Ball Joint", "Replace", "Front", "Replace front ball joint", 1.8, ["ball joint", "loose joint"], ["Front clunk", "Failed inspection"], ["Replace joint", "Inspect control arm", "Verify play"], ["alignment"], "front-suspension"),
    ] },
    { id: "rear-suspension", title: "Rear Suspension", operations: [
      labor("rear-shock-absorbers-both-sides", "Steering & Suspension", "Rear Suspension", "Shock Absorber", "Replace", "Rear Both", "Replace rear shock absorbers - both sides", 2.2, ["rear shock", "shock absorber", "bouncy rear", "rear suspension"], ["Rear feels bouncy over bumps", "Rear suspension noise"], ["Replace shocks", "Inspect mounts", "Road test"], [], "rear-suspension"),
      labor("rear-control-arm", "Steering & Suspension", "Rear Suspension", "Control Arm", "Replace", "Rear", "Replace rear control arm", 1.8, ["rear arm", "rear link"], ["Rear tire wear", "Rear clunk"], ["Replace arm/link", "Torque at ride height", "Inspect alignment"], ["alignment"], "rear-suspension"),
      labor("rear-sway-bar-links", "Steering & Suspension", "Rear Suspension", "Sway Bar Links", "Replace", "Rear Both", "Replace rear sway bar links", 0.9, ["sway link", "stabilizer link"], ["Rattle over bumps", "Loose link"], ["Replace links", "Inspect bushings", "Road test"], [], "rear-suspension"),
    ] },
    { id: "steering", title: "Steering Gear, Linkage & Alignment", operations: [
      labor("outer-tie-rod", "Steering & Suspension", "Steering Linkage", "Outer Tie Rod End", "Replace", "Side Specific", "Replace outer tie rod end", 0.9, ["tie rod", "outer tie rod"], ["Loose steering", "Failed inspection"], ["Replace tie rod", "Set toe close", "Verify steering"], ["alignment"], "steering-linkage"),
      labor("rack-pinion", "Steering & Suspension", "Steering Gear", "Rack & Pinion", "Replace", "Front", "Replace steering rack and pinion", 4.2, ["rack", "steering gear"], ["Power steering leak", "Steering bind"], ["Replace rack", "Bleed steering", "Verify assist"], ["alignment"], "steering-gear"),
      labor("four-wheel-alignment", "Steering & Suspension", "Alignment", "Wheel Alignment", "Adjust", "Vehicle", "Four-wheel alignment", 1.2, ["alignment", "toe", "camber"], ["Pulling", "Uneven tire wear"], ["Measure alignment", "Adjust available angles", "Print results"], [], "alignment"),
    ] },
  ] },
  { id: "starting-charging", title: "Starting & Charging", description: "Battery, cables, starter, alternator, power distribution, and charging controls.", groups: [
    { id: "battery-starter-alternator", title: "Battery, Starter & Alternator", operations: [
      labor("battery-replacement", "Starting & Charging", "Battery", "Battery", "Replace", "Engine Bay", "Replace battery", 0.4, ["battery", "dead battery"], ["No start", "Battery test failed"], ["Replace battery", "Clean terminals", "Register if required"]),
      labor("alternator-replacement", "Starting & Charging", "Charging System", "Alternator", "Replace", "Engine Bay", "Replace alternator assembly", 2.1, ["alternator", "generator", "battery light"], ["Battery lamp on", "Repeated dead battery"], ["Replace alternator", "Inspect belt", "Verify charging"], [], "front-accessory-drive"),
      labor("starter-replacement", "Starting & Charging", "Starting System", "Starter Motor", "Replace", "Engine Bay", "Replace starter motor", 1.8, ["starter", "no crank", "click"], ["Click and no crank", "Intermittent no start"], ["Replace starter", "Inspect cables", "Verify crank"]),
      labor("battery-cable", "Starting & Charging", "Power Distribution", "Battery Cable", "Replace", "Engine Bay", "Replace battery cable", 1.1, ["battery cable", "corrosion"], ["Voltage drop", "Corroded cable"], ["Replace cable", "Clean connection", "Voltage-drop verify"]),
    ] },
  ] },
  { id: "cooling", title: "Cooling System", description: "Radiator, water pump, thermostat, fans, hoses, pressure control, and thermal management.", groups: [
    { id: "coolant-flow", title: "Coolant Flow & Temperature Control", operations: [
      labor("water-pump-replacement", "Cooling System", "Coolant Pumping", "Water Pump", "Replace", "Engine Bay", "Replace water pump", 3.2, ["water pump", "coolant leak", "overheat"], ["Coolant leak", "Overheating"], ["Replace pump", "Refill and bleed", "Leak check"], ["coolant-service"], "cooling-drain-fill"),
      labor("thermostat-replacement", "Cooling System", "Temperature Control", "Thermostat", "Replace", "Engine Bay", "Replace thermostat", 1.6, ["thermostat", "stuck open", "stuck closed"], ["Overheating", "Runs cold"], ["Replace thermostat", "Refill coolant", "Verify temperature"], ["coolant-service"], "cooling-drain-fill"),
      labor("radiator-replacement", "Cooling System", "Heat Exchanger", "Radiator", "Replace", "Front", "Replace radiator assembly", 2.6, ["radiator", "coolant leak", "overheat"], ["Radiator leaking", "Temperature warning"], ["Replace radiator", "Transfer fittings", "Bleed system"], ["coolant-service"], "cooling-drain-fill"),
      labor("cooling-fan-assembly", "Cooling System", "Fan Control", "Cooling Fan Assembly", "Replace", "Front", "Replace cooling fan assembly", 1.5, ["cooling fan", "fan module"], ["Overheats at idle", "Fan inoperative"], ["Replace fan", "Verify command", "Road test"]),
    ] },
  ] },
  { id: "engine", title: "Engine Mechanical & Performance", description: "Internal engine, timing, sealing, mounts, intake, ignition, fuel, and performance repairs.", groups: [
    { id: "engine-mechanical", title: "Mechanical Engine Repairs", operations: [
      labor("engine-performance-diagnosis", "Engine Mechanical & Performance", "Engine Diagnosis", "Engine / Powertrain", "Diagnose", "Vehicle", "Diagnose engine performance concern", 1.0, ["engine issue", "engine issues", "engine problem", "engine diagnostic", "engine diagnosis"], ["Engine concern", "Engine runs poorly", "Engine noise", "Engine vibration"], ["Verify concern", "Scan and inspect applicable systems", "Record measurements and next-test recommendation"]),
      labor("valve-cover-gasket", "Engine Mechanical & Performance", "Engine Sealing", "Valve Cover Gasket", "Replace", "Engine", "Replace valve cover gasket", 2.4, ["valve cover", "oil leak"], ["Oil leak", "Burning oil smell"], ["Replace gasket", "Clean sealing surface", "Leak check"], [], "upper-engine-access"),
      labor("oil-pan-gasket", "Engine Mechanical & Performance", "Engine Sealing", "Oil Pan Gasket", "Replace", "Engine Lower", "Replace oil pan gasket", 3.8, ["oil pan", "lower oil leak"], ["Oil leak", "Oil pan seep"], ["Remove pan", "Replace gasket/sealant", "Leak check"], [], "lower-engine-access"),
      labor("engine-mount", "Engine Mechanical & Performance", "Engine Mounting", "Engine Mount", "Replace", "Side Specific", "Replace engine mount", 1.7, ["motor mount", "engine mount"], ["Vibration at idle", "Engine movement"], ["Support engine", "Replace mount", "Verify vibration"]),
      labor("timing-belt-service", "Engine Mechanical & Performance", "Timing System", "Timing Belt", "Replace", "Engine Front", "Timing belt service", 5.4, ["timing belt", "belt service"], ["Maintenance due", "Timing belt age"], ["Replace belt", "Set timing", "Verify operation"], ["coolant-service"], "front-engine-timing"),
    ] },
    { id: "fuel-ignition-air", title: "Fuel, Ignition & Air", operations: [
      labor("ignition-coil", "Engine Mechanical & Performance", "Ignition", "Ignition Coil", "Replace", "Cylinder Specific", "Replace ignition coil", 0.6, ["coil", "misfire"], ["Misfire", "Check engine light"], ["Replace coil", "Clear DTCs", "Verify misfire counter"]),
      labor("fuel-pump", "Engine Mechanical & Performance", "Fuel Delivery", "Fuel Pump", "Replace", "Tank", "Replace fuel pump module", 2.8, ["fuel pump", "no fuel pressure"], ["No start", "Low fuel pressure"], ["Replace module", "Verify pressure", "Leak check"]),
      labor("throttle-body", "Engine Mechanical & Performance", "Air Induction", "Throttle Body", "Replace", "Engine Bay", "Replace throttle body", 1.1, ["throttle body", "idle"], ["Rough idle", "Throttle fault"], ["Replace throttle body", "Perform relearn", "Verify idle"], [], "air-intake"),
      labor("mass-airflow-sensor", "Engine Mechanical & Performance", "Air Induction", "Mass Airflow Sensor", "Replace", "Engine Bay", "Replace mass airflow sensor", 0.4, ["maf", "airflow sensor"], ["Lean code", "Hesitation"], ["Replace sensor", "Inspect intake", "Verify trims"]),
    ] },
  ] },
  { id: "transmission-drivetrain", title: "Transmission & Drivetrain", description: "Automatic/manual transmission, transfer case, axles, driveshafts, differentials, and driveline service.", groups: [
    { id: "transmission", title: "Transmission & Transfer Case", operations: [
      labor("transmission-concern-diagnosis", "Transmission & Drivetrain", "Transmission", "Transmission / Driveline", "Diagnose", "Vehicle", "Diagnose transmission or driveline concern", 1.0, ["transmission issue", "transmission issues", "transmission problem", "transmission diagnostic", "gearbox problem"], ["Transmission concern", "Slipping or harsh shifting", "Delayed engagement", "Driveline concern"], ["Verify concern and operating conditions", "Scan and inspect applicable systems", "Record measurements and next-test recommendation"]),
      labor("transmission-remove-install", "Transmission & Drivetrain", "Transmission", "Transmission Assembly", "Replace", "Vehicle", "Remove and install transmission assembly", 8.5, ["transmission replacement", "r&i transmission"], ["Transmission failed", "No movement"], ["Remove transmission", "Install assembly", "Fill and relearn"], ["transmission-fluid-service"], "transmission-r&i"),
      labor("transmission-pan-gasket", "Transmission & Drivetrain", "Transmission", "Pan Gasket", "Replace", "Vehicle", "Replace transmission pan gasket", 1.2, ["trans pan", "trans leak"], ["Transmission fluid leak"], ["Remove pan", "Replace gasket/filter if applicable", "Verify level"], ["transmission-fluid-service"], "transmission-service"),
      labor("transfer-case-service", "Transmission & Drivetrain", "Transfer Case", "Transfer Case Fluid", "Service", "Vehicle", "Transfer case fluid service", 0.8, ["transfer case service", "4x4 service"], ["Maintenance due", "4WD service"], ["Drain and fill", "Inspect leaks", "Verify operation"], [], "fluid-service"),
    ] },
    { id: "axles-driveshaft", title: "Axles, CV, Driveshaft & Differential", operations: [
      labor("cv-axle", "Transmission & Drivetrain", "Axle Shaft", "CV Axle", "Replace", "Front", "Replace CV axle shaft", 1.8, ["cv axle", "axle shaft"], ["Clicking on turns", "Torn boot"], ["Replace axle", "Torque axle nut", "Road test"], [], "front-axle"),
      labor("wheel-hub-bearing", "Transmission & Drivetrain", "Wheel End", "Hub Bearing", "Replace", "Wheel Specific", "Replace wheel bearing / hub assembly", 1.9, ["wheel bearing", "hub", "humming"], ["Humming noise at speed", "Wheel play"], ["Replace hub", "Torque fasteners", "Verify noise"]),
      labor("differential-service", "Transmission & Drivetrain", "Differential", "Differential Fluid", "Service", "Axle", "Differential fluid service", 0.9, ["diff service", "gear oil"], ["Maintenance due", "Fluid contamination"], ["Drain/fill", "Inspect leaks", "Road test"], [], "fluid-service"),
      labor("u-joint", "Transmission & Drivetrain", "Driveshaft", "Universal Joint", "Replace", "Driveshaft", "Replace universal joint", 1.4, ["u joint", "driveshaft clunk"], ["Clunk on takeoff", "Driveline vibration"], ["Remove shaft", "Replace joint", "Verify phasing"]),
    ] },
  ] },
  { id: "hvac", title: "HVAC & Climate Control", description: "A/C, heating, refrigerant, blower, doors, actuators, and cabin climate repairs.", groups: [
    { id: "ac-refrigerant", title: "A/C Refrigerant & Compressor", operations: [
      labor("ac-compressor-replacement", "HVAC & Climate Control", "A/C Refrigerant", "Compressor", "Replace", "Engine Bay", "Replace A/C compressor", 2.8, ["ac compressor", "a/c not cold", "compressor"], ["A/C not cold", "Compressor noise"], ["Recover refrigerant", "Replace compressor", "Evacuate and recharge"], ["ac-evac-recharge"], "ac-open-system"),
      labor("ac-condenser", "HVAC & Climate Control", "A/C Refrigerant", "Condenser", "Replace", "Front", "Replace A/C condenser", 2.3, ["condenser", "ac leak"], ["A/C leak", "Collision damage"], ["Recover refrigerant", "Replace condenser", "Evacuate and recharge"], ["ac-evac-recharge"], "ac-open-system"),
      labor("ac-evaporator", "HVAC & Climate Control", "A/C Refrigerant", "Evaporator Core", "Replace", "Instrument Panel", "Replace A/C evaporator core", 7.5, ["evaporator", "dash removal"], ["A/C leak in cabin", "Evaporator leaking"], ["Remove instrument panel as needed", "Replace evaporator", "Recharge"], ["ac-evac-recharge"], "dash-access"),
    ] },
    { id: "airflow-heat", title: "Blower, Doors & Heat", operations: [
      labor("blower-motor", "HVAC & Climate Control", "Airflow", "Blower Motor", "Replace", "Cabin", "Replace blower motor", 0.9, ["blower motor", "no airflow"], ["No blower", "Blower noise"], ["Replace blower", "Inspect cabin filter", "Verify speeds"]),
      labor("blend-door-actuator", "HVAC & Climate Control", "Air Doors", "Blend Door Actuator", "Replace", "Cabin", "Replace blend door actuator", 1.2, ["blend door", "temperature actuator"], ["Wrong temperature", "Clicking under dash"], ["Replace actuator", "Calibrate doors", "Verify travel"]),
      labor("heater-core", "HVAC & Climate Control", "Heating", "Heater Core", "Replace", "Instrument Panel", "Replace heater core", 6.5, ["heater core", "no heat", "coolant smell"], ["Coolant smell in cabin", "No heat"], ["Drain coolant", "Access heater core", "Refill and bleed"], ["coolant-service"], "dash-access"),
    ] },
  ] },
  { id: "electrical-adas", title: "Electrical, Modules, Networks & ADAS", description: "Wiring, modules, programming, lighting, accessories, cameras, radars, and calibrations.", groups: [
    { id: "electrical-repair", title: "Power, Wiring & Accessories", operations: [
      labor("headlamp-assembly", "Electrical, Modules, Networks & ADAS", "Lighting", "Headlamp Assembly", "Replace", "Front", "Replace headlamp assembly", 1.1, ["headlight", "headlamp"], ["Headlamp inoperative", "Collision damage"], ["Replace lamp", "Aim if required", "Verify lighting"]),
      labor("window-regulator", "Electrical, Modules, Networks & ADAS", "Door Electrical", "Window Regulator", "Replace", "Door Specific", "Replace window regulator", 1.6, ["window regulator", "window won't go up"], ["Window inoperative", "Glass dropped"], ["Remove trim", "Replace regulator", "Initialize if required"]),
      labor("door-lock-actuator", "Electrical, Modules, Networks & ADAS", "Door Electrical", "Door Lock Actuator", "Replace", "Door Specific", "Replace door lock actuator", 1.4, ["door lock", "lock actuator"], ["Door will not lock", "Intermittent lock"], ["Remove trim", "Replace actuator", "Verify lock"]),
      labor("wire-repair", "Electrical, Modules, Networks & ADAS", "Wiring", "Harness / Connector", "Repair", "Circuit Specific", "Circuit wiring repair", 1.0, ["wire repair", "connector", "short"], ["Open circuit", "Short to ground"], ["Locate fault", "Repair wiring", "Load-test circuit"]),
    ] },
    { id: "modules-adas", title: "Modules, Programming & ADAS", operations: [
      labor("module-programming", "Electrical, Modules, Networks & ADAS", "Programming", "Control Module", "Program / Calibrate", "Vehicle", "Module programming / configuration", 1.2, ["programming", "module coding", "flash"], ["Replacement module", "Configuration fault"], ["Battery support", "Program/configure", "Post-scan"]),
      labor("adas-camera-calibration", "Electrical, Modules, Networks & ADAS", "ADAS", "Forward Camera", "Program / Calibrate", "Windshield / Front", "Forward camera calibration", 1.5, ["camera calibration", "lane camera"], ["Windshield replaced", "ADAS warning"], ["Pre-scan", "Calibrate camera", "Post-scan"], ["alignment"], "adas-calibration"),
      labor("radar-calibration", "Electrical, Modules, Networks & ADAS", "ADAS", "Radar Sensor", "Program / Calibrate", "Front / Rear", "Radar calibration", 1.7, ["radar calibration", "blind spot", "adaptive cruise"], ["Radar replaced", "ADAS unavailable"], ["Measure setup", "Calibrate radar", "Verify operation"], ["alignment"], "adas-calibration"),
    ] },
  ] },
  { id: "exhaust-emissions", title: "Exhaust & Emissions", description: "Exhaust leaks, catalysts, oxygen sensors, EVAP, EGR, diesel aftertreatment, and compliance repairs.", groups: [
    { id: "exhaust", title: "Exhaust & Catalyst", operations: [
      labor("oxygen-sensor-replacement", "Exhaust & Emissions", "Oxygen Sensing", "Oxygen Sensor", "Replace", "Bank / Sensor Specific", "Replace oxygen sensor", 1.0, ["oxygen sensor", "o2 sensor", "p013"], ["Check engine light", "Fuel trim fault"], ["Replace sensor", "Route harness", "Verify data"]),
      labor("catalytic-converter", "Exhaust & Emissions", "Catalyst", "Catalytic Converter", "Replace", "Exhaust", "Replace catalytic converter", 2.2, ["catalyst", "converter", "p0420"], ["Catalyst efficiency code", "Exhaust restriction"], ["Replace converter", "Inspect exhaust", "Verify monitor"]),
      labor("muffler", "Exhaust & Emissions", "Exhaust", "Muffler", "Replace", "Rear", "Replace muffler assembly", 1.0, ["muffler", "exhaust noise"], ["Loud exhaust", "Muffler leak"], ["Replace muffler", "Inspect hangers", "Leak check"]),
    ] },
    { id: "evap-diesel-aftertreatment", title: "EVAP, EGR & Aftertreatment", operations: [
      labor("evap-purge-valve", "Exhaust & Emissions", "EVAP", "Purge Valve", "Replace", "Engine Bay", "Replace EVAP purge valve", 0.6, ["purge valve", "evap"], ["Hard start after fueling", "EVAP code"], ["Replace valve", "Command test", "Verify seal"]),
      labor("egr-valve", "Exhaust & Emissions", "EGR", "EGR Valve", "Replace", "Engine Bay", "Replace EGR valve", 1.4, ["egr", "egr valve"], ["EGR code", "Rough running"], ["Replace valve", "Clean passage if accessible", "Verify command"]),
      labor("def-pump", "Exhaust & Emissions", "Diesel Aftertreatment", "DEF Pump", "Replace", "Underbody", "Replace DEF pump", 2.0, ["def pump", "scr", "diesel exhaust fluid"], ["DEF warning", "Derate"], ["Replace pump", "Prime system", "Verify dosing"]),
    ] },
  ] },
  { id: "body-collision", title: "Body, Glass, Collision & Refinish", description: "Mechanical body labor, glass, closures, trim, collision damage planning, refinish, and structural operations.", groups: [
    { id: "closures-glass", title: "Doors, Glass & Closures", operations: [
      labor("windshield-replacement", "Body, Glass, Collision & Refinish", "Glass", "Windshield", "Replace", "Front", "Replace windshield", 2.0, ["windshield", "glass"], ["Cracked windshield", "Glass replacement"], ["Remove glass", "Install windshield", "Leak check"], ["adas-camera-calibration"], "glass-replacement"),
      labor("door-shell", "Body, Glass, Collision & Refinish", "Door", "Door Shell", "Replace", "Door Specific", "Replace door shell", 4.0, ["door shell", "door replacement"], ["Collision damage", "Door rust"], ["Transfer components", "Align door", "Verify operation"], [], "door-transfer"),
      labor("window-glass", "Body, Glass, Collision & Refinish", "Glass", "Door Glass", "Replace", "Door Specific", "Replace door window glass", 1.1, ["door glass", "window glass"], ["Broken glass", "Window damage"], ["Remove trim", "Replace glass", "Verify run channel"]),
    ] },
    { id: "collision-refinish", title: "Collision, Structural & Refinish", operations: [
      labor("bumper-cover-front", "Body, Glass, Collision & Refinish", "Bumper", "Front Bumper Cover", "Replace", "Front", "Replace front bumper cover", 2.6, ["front bumper", "bumper cover"], ["Front collision damage"], ["Remove and transfer", "Install cover", "Check sensors"], ["radar-calibration"], "bumper-front"),
      labor("fender-replacement", "Body, Glass, Collision & Refinish", "Exterior Panel", "Fender", "Replace", "Side Specific", "Replace fender", 3.0, ["fender", "quarter panel front"], ["Side impact damage", "Panel rust"], ["Remove adjacent trim", "Replace fender", "Panel alignment"], [], "front-panel"),
      labor("panel-refinish", "Body, Glass, Collision & Refinish", "Refinish", "Panel", "Service", "Panel Specific", "Refinish exterior panel", 2.5, ["paint", "refinish", "blend"], ["Paint damage", "Collision refinish"], ["Prep", "Refinish", "Color match"], [], "refinish"),
      labor("structural-measure", "Body, Glass, Collision & Refinish", "Structural", "Frame / Unibody", "Measure", "Vehicle", "Structural measurement and setup", 2.0, ["frame measure", "unibody", "structural"], ["Collision damage", "Poor panel gaps"], ["Set up measuring", "Record dimensions", "Identify supplement risk"], [], "structural"),
    ] },
  ] },
  { id: "hybrid-ev", title: "Hybrid, EV & High Voltage", description: "High-voltage safety, battery, inverter, charging, thermal, and electrified-platform work.", groups: [
    { id: "hv-safety-service", title: "High Voltage Safety & Service", operations: [
      labor("hv-disable-enable", "Hybrid, EV & High Voltage", "High Voltage Safety", "Service Disconnect", "Service", "Vehicle", "High-voltage disable and enable procedure", 0.8, ["high voltage disable", "service disconnect"], ["HV service required", "EV repair setup"], ["Disable HV", "Verify zero potential", "Re-enable and scan"]),
      labor("hv-battery-cooling-service", "Hybrid, EV & High Voltage", "Battery Thermal", "Battery Cooling Circuit", "Service", "Vehicle", "High-voltage battery cooling service", 1.6, ["battery cooling", "ev coolant"], ["Thermal warning", "EV coolant service"], ["Disable as required", "Service cooling circuit", "Verify temperature"], ["hv-disable-enable"], "hv-thermal"),
      labor("charge-port", "Hybrid, EV & High Voltage", "Charging", "Charge Port", "Replace", "Body", "Replace EV charge port", 2.0, ["charge port", "will not charge"], ["Charging concern", "Damaged charge port"], ["Disable HV", "Replace port", "Verify charging"], ["hv-disable-enable"], "hv-charging"),
    ] },
  ] },
];

export const LABOR_OPERATION_ADD_ONS = [
  { id: "alignment", label: "Alignment recommended", hours: 1.2 },
  { id: "road-test", label: "Road test", hours: 0.3 },
  { id: "torque-verification", label: "Torque verification", hours: 0.2 },
  { id: "ac-evac-recharge", label: "A/C evac and recharge", hours: 1.4 },
  { id: "coolant-service", label: "Coolant drain, fill, and bleed", hours: 1.0 },
  { id: "brake-fluid-service", label: "Brake hydraulic bleed / fluid exchange", hours: 0.8 },
  { id: "transmission-fluid-service", label: "Transmission fluid fill and level set", hours: 0.8 },
  { id: "adas-camera-calibration", label: "ADAS camera calibration", hours: 1.5 },
  { id: "radar-calibration", label: "Radar / blind-spot calibration", hours: 1.7 },
  { id: "hv-disable-enable", label: "High-voltage disable / enable", hours: 0.8 },
];

export const flattenLaborOperationTaxonomy = (taxonomy: LaborOperationSystem[] = LABOR_OPERATION_TAXONOMY) => taxonomy.flatMap((system) => system.groups.flatMap((group) => group.operations));
