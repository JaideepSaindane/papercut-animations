const stamp = () => new Date().toISOString().slice(11, 19);

export const log = {
  info: (...a: unknown[]) => console.log(`${stamp()}`, ...a),
  warn: (...a: unknown[]) => console.warn(`${stamp()} ⚠`, ...a),
  error: (...a: unknown[]) => console.error(`${stamp()} ✖`, ...a),
};
