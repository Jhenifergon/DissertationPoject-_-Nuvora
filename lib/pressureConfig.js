// Shared configuration for Nuvora's transparent pressure model.
//
// Keeping these weights in one module prevents the calculation and the
// explanation layer from drifting apart. Any future dissertation-backed
// change to the model should be made here and covered by the scoring tests.
export const PRESSURE_WEIGHTS = Object.freeze({
  workload: 0.30,
  taskInitiation: 0.25,
  focus: 0.20,
  rest: 0.15,
  confidence: 0.10,
});

export const PRESSURE_LABELS = Object.freeze({
  workload: 'Workload feeling',
  taskInitiation: 'Task initiation',
  focus: 'Focus',
  rest: 'Rest',
  confidence: 'Confidence',
});