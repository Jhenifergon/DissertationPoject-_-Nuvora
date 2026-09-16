const planningTasks = [
  {
    id: 'synthetic-plan-01',
    title: 'Review accessibility test results',
    module: 'Dissertation',
    due: '2026-09-17',
    priority: 'high',
    bucket: 'today',
    type: 'study',
    currentStep:
      'Open the latest test output and note any failures.',
  },

  {
    id: 'synthetic-plan-02',
    title: 'Update implementation chapter',
    module: 'Dissertation',
    due: '2026-09-18',
    priority: 'high',
    bucket: 'today',
    type: 'essay',
    currentStep:
      'Add one paragraph explaining the Firebase implementation.',
  },

  {
    id: 'synthetic-plan-03',
    title: 'Add final application screenshots',
    module: 'Dissertation',
    due: '2026-09-19',
    priority: 'normal',
    bucket: 'week',
    type: 'assignment',
    currentStep:
      'Choose the clearest Today screen screenshot.',
  },

  {
    id: 'synthetic-plan-04',
    title: 'Review evaluation methodology',
    module: 'Dissertation',
    due: '2026-09-20',
    priority: 'high',
    bucket: 'week',
    type: 'study',
    currentStep:
      'Read the evaluation section and highlight missing evidence.',
  },

  {
    id: 'synthetic-plan-05',
    title: 'Complete evaluation findings',
    module: 'Dissertation',
    due: '2026-09-21',
    priority: 'high',
    bucket: 'week',
    type: 'essay',
    currentStep:
      'Write the first paragraph of the findings section.',
  },

  {
    id: 'synthetic-plan-06',
    title: 'Check figures and table numbering',
    module: 'Dissertation',
    due: '2026-09-22',
    priority: 'normal',
    bucket: 'week',
    type: 'assignment',
    currentStep:
      'Check figures 1 to 5 against the contents list.',
  },

  {
    id: 'synthetic-plan-07',
    title: 'Review Harvard references',
    module: 'Dissertation',
    due: '2026-09-23',
    priority: 'normal',
    bucket: 'week',
    type: 'study',
    currentStep:
      'Check five references for formatting consistency.',
  },

  {
    id: 'synthetic-plan-08',
    title: 'Proofread dissertation introduction',
    module: 'Dissertation',
    due: '2026-09-24',
    priority: 'normal',
    bucket: 'week',
    type: 'essay',
    currentStep:
      'Read the introduction once without editing.',
  },

  {
    id: 'synthetic-plan-09',
    title: 'Run final automated tests',
    module: 'Dissertation',
    due: '2026-09-25',
    priority: 'high',
    bucket: 'week',
    type: 'assignment',
    currentStep:
      'Run the complete Vitest suite.',
  },

  {
    id: 'synthetic-plan-10',
    title: 'Prepare final dissertation PDF',
    module: 'Dissertation',
    due: '2026-09-26',
    priority: 'high',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Export a draft PDF and check page breaks.',
  },

  {
    id: 'synthetic-plan-11',
    title: 'Check appendix evidence',
    module: 'Dissertation',
    due: '2026-09-28',
    priority: 'normal',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Open the appendices and check the first evidence item.',
  },

  {
    id: 'synthetic-plan-12',
    title: 'Prepare final submission folder',
    module: 'Dissertation',
    due: '2026-09-30',
    priority: 'high',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Create the final submission folder and add the report.',
  },

  {
    id: 'synthetic-plan-13',
    title: 'Review supervisor feedback',
    module: 'Dissertation',
    due: '2026-10-03',
    priority: 'normal',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Read the latest feedback and identify one required change.',
  },

  {
    id: 'synthetic-plan-14',
    title: 'Final application walkthrough',
    module: 'Dissertation',
    due: '2026-10-06',
    priority: 'normal',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Open Nuvora and complete one full user journey.',
  },

  {
    id: 'synthetic-plan-15',
    title: 'Review usability notes',
    module: 'Research',
    due: '2026-10-10',
    priority: 'normal',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Read the first usability note and identify one recurring issue.',
  },

  {
    id: 'synthetic-plan-16',
    title: 'Update limitations section',
    module: 'Dissertation',
    due: '2026-10-14',
    priority: 'normal',
    bucket: 'later',
    type: 'essay',
    currentStep:
      'Add one limitation relating to the evaluation sample.',
  },

  {
    id: 'synthetic-plan-17',
    title: 'Review privacy and ethics discussion',
    module: 'Dissertation',
    due: '2026-10-18',
    priority: 'high',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Check the privacy section against the final Firebase behaviour.',
  },

  {
    id: 'synthetic-plan-18',
    title: 'Prepare final demo notes',
    module: 'Dissertation',
    due: '2026-10-22',
    priority: 'normal',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Write the first three points for the application demo.',
  },

  {
    id: 'synthetic-plan-19',
    title: 'Archive project evidence',
    module: 'Dissertation',
    due: '2026-10-28',
    priority: 'low',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Create an evidence archive folder and add the latest screenshots.',
  },

  {
    id: 'synthetic-plan-20',
    title: 'Review final Git history',
    module: 'Dissertation',
    due: '2026-11-03',
    priority: 'normal',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Check the latest five commits and confirm their messages are clear.',
  },

  {
    id: 'synthetic-plan-21',
    title: 'Summarise testing outcomes',
    module: 'Dissertation',
    due: '2026-11-08',
    priority: 'normal',
    bucket: 'later',
    type: 'essay',
    currentStep:
      'Write one paragraph summarising the final automated test result.',
  },

  {
    id: 'synthetic-plan-22',
    title: 'Review pressure model documentation',
    module: 'Dissertation',
    due: '2026-11-12',
    priority: 'normal',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Check that the documented pressure weights match the final code.',
  },

  {
    id: 'synthetic-plan-23',
    title: 'Review accessibility evidence',
    module: 'Dissertation',
    due: '2026-11-17',
    priority: 'normal',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Compare the final accessibility screenshots with the test evidence.',
  },

  {
    id: 'synthetic-plan-24',
    title: 'Prepare project retrospective',
    module: 'Dissertation',
    due: '2026-11-22',
    priority: 'low',
    bucket: 'later',
    type: 'essay',
    currentStep:
      'Write three short notes about what went well during development.',
  },

  {
    id: 'synthetic-plan-25',
    title: 'Review future work ideas',
    module: 'Dissertation',
    due: '2026-11-28',
    priority: 'low',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Choose the three most realistic future improvements.',
  },

  {
    id: 'synthetic-plan-26',
    title: 'Organise research materials',
    module: 'Research',
    due: '2026-12-03',
    priority: 'low',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Move research notes into clearly labelled folders.',
  },

  {
    id: 'synthetic-plan-27',
    title: 'Archive evaluation data',
    module: 'Research',
    due: '2026-12-08',
    priority: 'normal',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Check which evaluation files need to be retained or deleted.',
  },

  {
    id: 'synthetic-plan-28',
    title: 'Review final project documentation',
    module: 'Dissertation',
    due: '2026-12-12',
    priority: 'normal',
    bucket: 'later',
    type: 'study',
    currentStep:
      'Open the project documentation and check the setup instructions.',
  },

  {
    id: 'synthetic-plan-29',
    title: 'Clean development files',
    module: 'Dissertation',
    due: '2026-12-17',
    priority: 'low',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Identify temporary files that are no longer needed.',
  },

  {
    id: 'synthetic-plan-30',
    title: 'Back up final Nuvora project',
    module: 'Dissertation',
    due: '2026-12-21',
    priority: 'high',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Create a final backup of the repository and dissertation evidence.',
  },

  {
    id: 'synthetic-plan-31',
    title: 'Write project reflection notes',
    module: 'Dissertation',
    due: '2026-12-27',
    priority: 'low',
    bucket: 'later',
    type: 'essay',
    currentStep:
      'Write one paragraph about the main development lesson learned.',
  },

  {
    id: 'synthetic-plan-32',
    title: 'Complete end-of-year project archive',
    module: 'Dissertation',
    due: '2026-12-31',
    priority: 'normal',
    bucket: 'later',
    type: 'assignment',
    currentStep:
      'Confirm that code, documentation and evidence are backed up.',
  },
];
