export const ORG_ZOOM_MIN = 0.4;
export const ORG_ZOOM_MAX = 2;
export const ORG_ZOOM_STEP = 0.15;
export const ORG_ZOOM_DEFAULT = 1;

export function clampOrgZoom(value: number): number {
  if (!Number.isFinite(value)) return ORG_ZOOM_DEFAULT;
  return Math.min(ORG_ZOOM_MAX, Math.max(ORG_ZOOM_MIN, Math.round(value * 100) / 100));
}

export function stepOrgZoom(current: number, direction: 1 | -1): number {
  return clampOrgZoom(current + direction * ORG_ZOOM_STEP);
}

export function fitOrgZoom(
  viewport: { width: number; height: number },
  content: { width: number; height: number },
  padding = 48,
): number {
  if (content.width <= 0 || content.height <= 0) return ORG_ZOOM_DEFAULT;
  const availableW = Math.max(viewport.width - padding, 1);
  const availableH = Math.max(viewport.height - padding, 1);
  return clampOrgZoom(Math.min(availableW / content.width, availableH / content.height, 1));
}

export function formatOrgZoom(zoom: number): string {
  return `${Math.round(clampOrgZoom(zoom) * 100)}%`;
}
