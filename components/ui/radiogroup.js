// Gives custom role="radio" groups the arrow-key behaviour native radio
// inputs get for free (WAI-ARIA radiogroup pattern): Left/Up selects the
// previous option, Right/Down the next, Home/End jump to the ends, and
// focus follows the newly selected option so keyboard users always know
// where they are.
export function handleRadiogroupKeyDown(e, containerRef, values, current, onSelect) {
  let idx = values.indexOf(current);
  if (idx === -1) idx = 0;
  let nextIdx;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % values.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + values.length) % values.length;
  else if (e.key === 'Home') nextIdx = 0;
  else if (e.key === 'End') nextIdx = values.length - 1;
  else return;
  e.preventDefault();
  const nextValue = values[nextIdx];
  onSelect(nextValue);
  requestAnimationFrame(() => {
    const match = Array.from(containerRef.current?.querySelectorAll('[data-value]') || []).find(el => el.dataset.value === String(nextValue));
    match?.focus();
  });
}
