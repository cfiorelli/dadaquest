function pointInsideSurface(surface, x, z = 0) {
  return x >= (surface.x - (surface.w * 0.5))
    && x <= (surface.x + (surface.w * 0.5))
    && z >= ((surface.z ?? 0) - (surface.d * 0.5))
    && z <= ((surface.z ?? 0) + (surface.d * 0.5));
}

export function surfaceTop(surface) {
  return surface.y + (surface.h * 0.5);
}

export function getNearestSurfaceTopY(layout, x, z = 0) {
  const surfaces = [layout.ground, ...(layout.platforms || [])];
  let bestTop = null;
  for (const surface of surfaces) {
    if (!pointInsideSurface(surface, x, z)) continue;
    const top = surfaceTop(surface);
    if (bestTop === null || top > bestTop) {
      bestTop = top;
    }
  }
  return bestTop;
}

export function normalizeCoinsOnSurfaces(layout, {
  defaultZ = 0,
  hoverY = 1.02,
} = {}) {
  return (layout.coins || []).map((coin) => {
    const coinZ = Number.isFinite(coin.z) ? coin.z : defaultZ;
    const top = getNearestSurfaceTopY(layout, coin.x, coinZ);
    if (top === null) return { ...coin, z: coinZ };
    return {
      ...coin,
      z: coinZ,
      y: Number((top + hoverY).toFixed(3)),
    };
  });
}
