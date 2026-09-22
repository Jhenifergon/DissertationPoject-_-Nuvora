// Temporary Calm-session preferences. These deliberately stay out of
// Firebase and reset each time Calm Mode starts, so the student can
// reduce demand in the moment without changing their normal setup.
export const CALM_SESSION_DEFAULTS = {
  hideDeadlines: true,
  hideProgressNumbers: true,
  reduceVisualDetail: true,
  reduceMotion: true,
};

export const GENERIC_ERROR = 'That did not save. Please try again in a moment.';
