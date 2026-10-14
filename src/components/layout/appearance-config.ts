export const APPEARANCE_STORAGE_KEY = "tms-app-appearance";

export const appearanceInitializationScript = `
try {
  var appearance = localStorage.getItem("${APPEARANCE_STORAGE_KEY}") === "dark" ? "dark" : "light";
  document.documentElement.dataset.appTheme = appearance;
  document.documentElement.style.colorScheme = appearance;
} catch (_) {
  document.documentElement.dataset.appTheme = "light";
}
`;
