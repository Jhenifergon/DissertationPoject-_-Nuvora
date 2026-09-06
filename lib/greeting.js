// Replaces the previous hardcoded "GOOD MORNING" / fixed "J" avatar with
// values computed from the actual clock and the user's own settings.

export function timeOfDayGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Falls back to a neutral label rather than inventing or guessing a name.
export function displayNameOrFallback(displayName) {
  const trimmed = (displayName || '').trim();
  return trimmed || 'there';
}

export function avatarInitial(displayName) {
  const trimmed = (displayName || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '·';
}
