export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const VIN_TRANSLITERATION: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidVin(value: string) {
  if (!VIN_PATTERN.test(value)) return false;
  const sum = [...value].reduce((total, character, index) => {
    const number = /\d/.test(character) ? Number(character) : VIN_TRANSLITERATION[character];
    return total + number * VIN_WEIGHTS[index];
  }, 0);
  const expected = sum % 11 === 10 ? "X" : String(sum % 11);
  return value[8] === expected;
}
