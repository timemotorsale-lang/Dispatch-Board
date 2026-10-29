const vehicleColors: Record<string, string> = {
  beige: "#D8C6A3", black: "#171717", blue: "#2457C5", bronze: "#A97142",
  brown: "#75452B", burgundy: "#800020", cream: "#FFF1D0", gold: "#D4AF37",
  gray: "#808080", grey: "#808080", green: "#287A3D", orange: "#F07818",
  purple: "#7540A0", red: "#D9232E", saddle: "#8B4513", silver: "#C0C0C0",
  tan: "#D2B48C", white: "#FFFFFF", yellow: "#F6D32D"
};

export function vehicleColorSwatch(label: string): string | null {
  const key = label.trim().toLowerCase();
  return Object.hasOwn(vehicleColors, key) ? vehicleColors[key] : null;
}
