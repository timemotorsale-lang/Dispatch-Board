export type Corner = { horizontal: number; vertical: number };
export type DocumentCorners = [Corner, Corner, Corner, Corner];

export function fullPageCorners(): DocumentCorners {
  return [{ horizontal: 0, vertical: 0 }, { horizontal: 1, vertical: 0 }, { horizontal: 1, vertical: 1 }, { horizontal: 0, vertical: 1 }];
}

export function documentQualityHints(pixels: Uint8ClampedArray, width: number, height: number) {
  let edgeEnergy = 0, bright = 0, dark = 0;
  const shade = (index: number) => (pixels[index * 4] + pixels[index * 4 + 1] + pixels[index * 4 + 2]) / 3;
  for (let row = 1; row < height - 1; row++) for (let column = 1; column < width - 1; column++) {
    const index = row * width + column, value = shade(index);
    const laplacian = shade(index - 1) + shade(index + 1) + shade(index - width) + shade(index + width) - 4 * value;
    edgeEnergy += laplacian * laplacian;
    if (value > 250) bright++;
    if (value < 25) dark++;
  }
  const count = Math.max(1, (width - 2) * (height - 2));
  return [
    ...(edgeEnergy / count < 35 ? ["Low detail: check that text is sharp before keeping this image."] : []),
    ...(bright / count > 0.85 ? ["Very bright image: check for glare or washed-out text."] : []),
    ...(dark / count > 0.8 ? ["Very dark image: move to a brighter area."] : [])
  ];
}

export function validCorners(corners: DocumentCorners) {
  if (corners.some((point) => !Number.isFinite(point.horizontal) || !Number.isFinite(point.vertical) || point.horizontal < 0 || point.horizontal > 1 || point.vertical < 0 || point.vertical > 1)) return false;
  const crossProducts = corners.map((point, index) => {
    const next = corners[(index + 1) % 4], after = corners[(index + 2) % 4];
    return (next.horizontal - point.horizontal) * (after.vertical - next.vertical) - (next.vertical - point.vertical) * (after.horizontal - next.horizontal);
  });
  return crossProducts.every((product) => product > 0.002);
}

export function detectDocumentCorners(pixels: Uint8ClampedArray, width: number, height: number): DocumentCorners | null {
  const histogram = new Array<number>(256).fill(0);
  for (let offset = 0; offset < pixels.length; offset += 4) histogram[Math.round((pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3)]++;
  const count = width * height;
  let weightedTotal = 0;
  histogram.forEach((frequency, shade) => { weightedTotal += frequency * shade; });
  let backgroundCount = 0, backgroundTotal = 0, variance = 0, threshold = 128;
  for (let shade = 0; shade < 255; shade++) {
    backgroundCount += histogram[shade];
    backgroundTotal += histogram[shade] * shade;
    const foregroundCount = count - backgroundCount;
    if (!backgroundCount || !foregroundCount) continue;
    const difference = backgroundTotal / backgroundCount - (weightedTotal - backgroundTotal) / foregroundCount;
    const candidate = backgroundCount * foregroundCount * difference * difference;
    if (candidate > variance) { variance = candidate; threshold = shade; }
  }
  if (variance / (count * count) < 100) return null;
  const visited = new Uint8Array(count);
  let largest: number[] = [];
  for (let start = 0; start < count; start++) {
    if (visited[start]) continue;
    visited[start] = 1;
    const shade = (pixels[start * 4] + pixels[start * 4 + 1] + pixels[start * 4 + 2]) / 3;
    if (shade <= threshold) continue;
    const component = [start];
    for (let cursor = 0; cursor < component.length; cursor++) {
      const index = component[cursor];
      const column = index % width;
      const neighbors = [index - width, index + width, ...(column > 0 ? [index - 1] : []), ...(column < width - 1 ? [index + 1] : [])];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= count || visited[neighbor]) continue;
        visited[neighbor] = 1;
        if ((pixels[neighbor * 4] + pixels[neighbor * 4 + 1] + pixels[neighbor * 4 + 2]) / 3 > threshold) component.push(neighbor);
      }
    }
    if (component.length > largest.length) largest = component;
  }
  if (largest.length < count * 0.15 || largest.length > count * 0.96) return null;
  const extremes = [Infinity, -Infinity, -Infinity, Infinity];
  const corners = fullPageCorners();
  for (const index of largest) {
    const horizontal = (index % width) / (width - 1), vertical = Math.floor(index / width) / (height - 1);
    const sum = horizontal + vertical, difference = horizontal - vertical;
    if (sum < extremes[0]) { extremes[0] = sum; corners[0] = { horizontal, vertical }; }
    if (difference > extremes[1]) { extremes[1] = difference; corners[1] = { horizontal, vertical }; }
    if (sum > extremes[2]) { extremes[2] = sum; corners[2] = { horizontal, vertical }; }
    if (difference < extremes[3]) { extremes[3] = difference; corners[3] = { horizontal, vertical }; }
  }
  return validCorners(corners) ? corners : null;
}

export function perspectiveMap(corners: DocumentCorners) {
  if (!validCorners(corners)) throw new Error("Keep four corners in order around the document without crossing the edges.");
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const deltaHorizontal = topLeft.horizontal - topRight.horizontal + bottomRight.horizontal - bottomLeft.horizontal;
  const deltaVertical = topLeft.vertical - topRight.vertical + bottomRight.vertical - bottomLeft.vertical;
  const firstHorizontal = topRight.horizontal - bottomRight.horizontal, secondHorizontal = bottomLeft.horizontal - bottomRight.horizontal;
  const firstVertical = topRight.vertical - bottomRight.vertical, secondVertical = bottomLeft.vertical - bottomRight.vertical;
  const determinant = firstHorizontal * secondVertical - secondHorizontal * firstVertical;
  const projectHorizontal = Math.abs(determinant) < 1e-10 ? 0 : (deltaHorizontal * secondVertical - secondHorizontal * deltaVertical) / determinant;
  const projectVertical = Math.abs(determinant) < 1e-10 ? 0 : (firstHorizontal * deltaVertical - deltaHorizontal * firstVertical) / determinant;
  return (horizontal: number, vertical: number): Corner => {
    const divisor = projectHorizontal * horizontal + projectVertical * vertical + 1;
    return {
      horizontal: ((topRight.horizontal - topLeft.horizontal + projectHorizontal * topRight.horizontal) * horizontal + (bottomLeft.horizontal - topLeft.horizontal + projectVertical * bottomLeft.horizontal) * vertical + topLeft.horizontal) / divisor,
      vertical: ((topRight.vertical - topLeft.vertical + projectHorizontal * topRight.vertical) * horizontal + (bottomLeft.vertical - topLeft.vertical + projectVertical * bottomLeft.vertical) * vertical + topLeft.vertical) / divisor
    };
  };
}

export function correctDocument(source: ImageData, corners: DocumentCorners, grayscale: boolean) {
  const map = perspectiveMap(corners);
  const distance = (first: Corner, second: Corner) => Math.hypot((first.horizontal - second.horizontal) * source.width, (first.vertical - second.vertical) * source.height);
  const targetWidth = Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2]));
  const targetHeight = Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2]));
  const scale = Math.min(1, 2200 / Math.max(targetWidth, targetHeight));
  const width = Math.max(2, Math.round(targetWidth * scale)), height = Math.max(2, Math.round(targetHeight * scale));
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const point = map(column / (width - 1), row / (height - 1));
      const sourceHorizontal = Math.max(0, Math.min(source.width - 1, point.horizontal * (source.width - 1)));
      const sourceVertical = Math.max(0, Math.min(source.height - 1, point.vertical * (source.height - 1)));
      const left = Math.floor(sourceHorizontal), top = Math.floor(sourceVertical);
      const right = Math.min(left + 1, source.width - 1), bottom = Math.min(top + 1, source.height - 1);
      const horizontalWeight = sourceHorizontal - left, verticalWeight = sourceVertical - top;
      const offset = (row * width + column) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const topValue = source.data[(top * source.width + left) * 4 + channel] * (1 - horizontalWeight) + source.data[(top * source.width + right) * 4 + channel] * horizontalWeight;
        const bottomValue = source.data[(bottom * source.width + left) * 4 + channel] * (1 - horizontalWeight) + source.data[(bottom * source.width + right) * 4 + channel] * horizontalWeight;
        pixels[offset + channel] = topValue * (1 - verticalWeight) + bottomValue * verticalWeight;
      }
      if (grayscale) {
        const shade = Math.max(0, Math.min(255, ((pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114) - 128) * 1.15 + 140));
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = shade;
      }
      pixels[offset + 3] = 255;
    }
  }
  return { pixels, width, height };
}
