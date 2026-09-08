// The module list used to be a fixed, hardcoded set. It now grows with the
// user's own tasks: any module name they've actually used appears as a
// selectable chip, on top of a small starter set for a brand-new account.
// This needs no separate storage — it's derived from data already saved.

const STARTER_MODULES = ['Dissertation', 'Other'];

export function availableModules(tasks = []) {
  const used = tasks.map(t => t.module).filter(Boolean);
  const unique = [...new Set([...STARTER_MODULES, ...used])];
  // Keep "Other" last so it reads as a catch-all rather than a real module.
  return unique.filter(m => m !== 'Other').concat(unique.includes('Other') ? ['Other'] : []);
}

// A small, muted colour per module — purely decorative, so a student can
// tell modules apart at a glance across Tasks and the add-task form. Named
// modules from the original prototype keep their original colour for
// continuity; anything else (a module a student typed themselves) gets a
// deterministic colour from the same palette, so it stays stable across
// renders without needing to be stored anywhere.
const NAMED_MODULE_COLORS = {
  Dissertation: 'amber',
  'Database Systems': 'purple',
  'HCI Group Project': 'teal',
  'Web Development': 'blue',
};
const FALLBACK_PALETTE = ['purple', 'teal', 'amber', 'blue'];

export function moduleColor(name) {
  if (NAMED_MODULE_COLORS[name]) return NAMED_MODULE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}
