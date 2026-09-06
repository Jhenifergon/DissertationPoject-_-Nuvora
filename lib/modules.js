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
