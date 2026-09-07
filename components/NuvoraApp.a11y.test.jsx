import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import NuvoraApp from './NuvoraApp';

// These tests render the real app in local/demo mode (no Firebase env vars
// are set in the test environment) and run axe-core's automated ruleset
// against each main screen. This is the *automated* half of the Phase 3
// accessibility audit — it catches missing labels, contrast issues, and
// invalid ARIA usage, but it cannot confirm how a real screen reader
// actually announces things or whether a keyboard-only run-through feels
// right. See the Phase 3b audit notes for what was checked manually
// instead, and why the two are reported separately rather than treating
// an automated pass as if it were a full accessibility sign-off.

async function runAxe(container) {
  const results = await axe.run(container, {
    // React 19 attaches some internal bookkeeping to the DOM in test
    // environments; this rule set is unaffected either way, kept default.
  });
  return results.violations;
}

function describeViolations(violations) {
  return violations.map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`).join('\n');
}

beforeEach(() => {
  // Seed an explicit blank state rather than relying on localStorage.clear()
  // (which now falls back to the richer demo seed added for a more
  // realistic first look at the app) — these tests need a controlled,
  // predictable starting point independent of that sample content.
  localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], reflections: [], settings: {}, stats: {} }));
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('accessibility: main screens (axe-core)', () => {
  it('Today screen has no automated accessibility violations', async () => {
    const { container } = render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    const violations = await runAxe(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it('Tasks screen (including the add-task form) has no automated violations', async () => {
    const { container } = render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await screen.findByLabelText('Task name');
    const violations = await runAxe(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it('Check-in question screen has no automated violations', async () => {
    const { container } = render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('Check in when it would help'));
    await screen.findByRole('radiogroup');
    const violations = await runAxe(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it('Learn, Progress, Support and Settings screens have no automated violations', async () => {
    const { container } = render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    for (const label of ['Learn', 'Progress', 'Support']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(container.querySelector('.content')).toBeTruthy());
      const violations = await runAxe(container);
      expect(violations, `${label}: ${describeViolations(violations)}`).toHaveLength(0);
    }
  });

  it('Overwhelmed Mode, including a selected barrier panel, has no automated violations', async () => {
    const { container } = render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    await screen.findByRole('radiogroup');
    fireEvent.click(screen.getByText('The task feels too big'));
    const violations = await runAxe(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});

describe('accessibility: drawer focus management (manual DOM assertions, not axe)', () => {
  it('moves focus into the drawer on open, and returns it to the trigger on Escape', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    const openButton = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(openButton);

    const dialog = await screen.findByRole('dialog', { name: 'Menu' });
    const closeButton = within(dialog).getByRole('button', { name: 'Close menu' });
    await waitFor(() => expect(document.activeElement).toBe(closeButton));

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(openButton));
  });

  it('traps Tab within the drawer while it is open', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Menu' });
    const focusable = within(dialog).getAllByRole('button');
    const last = focusable[focusable.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    await waitFor(() => expect(document.activeElement).toBe(focusable[0]));
  });
});

describe('accessibility: check-in radiogroup keyboard navigation (manual DOM assertions, not axe)', () => {
  it('ArrowRight moves both selection and focus to the next option', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('Check in when it would help'));
    const group = await screen.findByRole('radiogroup');
    const options = within(group).getAllByRole('radio');
    options[0].focus();

    fireEvent.keyDown(group, { key: 'ArrowRight' });
    await waitFor(() => expect(options[1]).toHaveAttribute('aria-checked', 'true'));
    await waitFor(() => expect(document.activeElement).toBe(options[1]));
  });

  it('End moves selection to the last option ("Not sure")', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('Check in when it would help'));
    const group = await screen.findByRole('radiogroup');
    const options = within(group).getAllByRole('radio');
    options[0].focus();

    fireEvent.keyDown(group, { key: 'End' });
    const last = options[options.length - 1];
    await waitFor(() => expect(last).toHaveAttribute('aria-checked', 'true'));
  });
});
