// Shared configuration for Nuvora's transparent pressure model.
//
// Keeping these weights in one module prevents the calculation and the
// explanation layer from drifting apart. Any future dissertation-backed
// change to the model should be made here and covered by the scoring tests.
//
// The weights are my own design decision, not clinically validated values.
// Workload feeling and task initiation carry the most weight because the
// app's aim is academic overload and difficulty getting started — the two
// problems Nuvora's features respond to most directly. The weights sum to
// 1.0 so the combined score stays on the same 0–100 scale as each factor.
// Object.freeze stops any other module changing the weights at runtime.
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