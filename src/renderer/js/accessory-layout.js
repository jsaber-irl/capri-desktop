// Shared coordinate mapping for the accessory editor preview and Capri's sprite canvas.
export function accessoryLayout(mod = {}, scale = 1, { pad = 56, spriteWidth = 240, spriteHeight = 420 } = {}) {
  const width = Number.isFinite(mod.width) ? mod.width : 120;
  const height = Number.isFinite(mod.height) ? mod.height : 70;
  const x = Number.isFinite(mod.x) ? mod.x : 118;
  const y = Number.isFinite(mod.y) ? mod.y : 20;
  const anchor = mod.anchor === 'top-left' || mod.anchor === 0 ? 0 : 0.5;
  const logicalLeft = pad + x - width * anchor;
  const logicalTop = pad + y;
  return {
    left: logicalLeft * scale,
    top: logicalTop * scale,
    width: width * scale,
    height: height * scale,
    transformOriginX: (pad + spriteWidth / 2 - logicalLeft) * scale,
    transformOriginY: (pad + spriteHeight / 2 - logicalTop) * scale,
  };
}
