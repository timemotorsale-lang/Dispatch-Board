export const LIGHT_DUTY_DIAGRAM_GROUPS: Record<string, readonly string[]> = {
  "service-oil": ["maintenance-sample", "maintenance-service"], "service-fluids": ["maintenance-fluids", "maintenance-inspections"], "service-belt": ["maintenance-belts"],
  "engine-core": ["engine-assembly", "engine-bottom", "engine-commissioning"], "engine-head": ["engine-head"], "engine-timing": ["engine-timing"], "engine-pan": ["engine-lubrication"],
  "engine-water-pump": ["engine-cooling"], "engine-intake": ["engine-air", "engine-ventilation"], "engine-injector": ["engine-fuel", "engine-diesel"], "engine-ignition": ["engine-sample", "engine-controls"], "engine-turbo": ["engine-boost"],
  "driveline-gearbox": ["transmission-sample", "transmission-cvt", "transmission-manual", "transmission-controls", "transmission-verification"], "driveline-transfer": ["transmission-transfer"], "driveline-differential": ["transmission-differential"], "driveline-shaft": ["transmission-shafts"],
  "wheel-tire": ["tires-sample"], "wheel-hub": ["tires-hubs"], "wheel-tpms": ["tires-tpms"], "wheel-rim": ["tires-rims"],
  "electric-battery": ["electrical-sample"], "electric-fuses": ["electrical-distribution", "electrical-trailer", "electrical-lighting"], "electric-module": ["electrical-network", "electrical-security", "electrical-instruments"], "electric-harness": ["electrical-waveform"],
  "climate-blower": ["hvac-sample", "hvac-controls", "hvac-drains"], "climate-compressor": ["hvac-refrigerant", "hvac-heatpump"], "climate-heater": ["hvac-heat"],
  "emissions-oxygen": ["exhaust-sample"], "emissions-muffler": ["exhaust-hardware"], "emissions-catalyst": ["exhaust-catalyst"], "emissions-evap": ["exhaust-evap"], "emissions-egr": ["exhaust-egr"], "emissions-dpf": ["exhaust-diesel"],
  "safety-camera": ["safety-sample", "safety-verification"], "safety-airbag": ["safety-srs"], "safety-belt": ["safety-belts"], "safety-radar": ["safety-braking"],
  "body-window": ["body-sample", "body-glass", "body-collision"], "body-wiper": ["body-wipers"], "body-seat": ["body-seats"], "body-roof": ["body-roof"], "body-liftgate": ["body-closures"], "body-display": ["body-infotainment"], "body-mirror": ["body-trim", "body-water"],
  "ev-pack": ["ev-battery"], "ev-drive-unit": ["ev-drive", "ev-hybrid"], "ev-port": ["ev-charge-hardware"], "ev-thermal": ["ev-sample"], "ev-contactors": ["ev-service", "ev-verification"]
};
