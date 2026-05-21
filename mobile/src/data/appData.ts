export const weeklyPerformance = [
  { day: 'Mon', score: 72, highlight: false },
  { day: 'Tue', score: 85, highlight: false },
  { day: 'Wed', score: 78, highlight: false },
  { day: 'Thu', score: 91, highlight: true },
  { day: 'Fri', score: 88, highlight: false },
  { day: 'Sat', score: 76, highlight: false },
  { day: 'Sun', score: 84, highlight: false },
];

export const tutorPrompts = [
  { title: 'Reinforcement schedules', body: 'Explain fixed vs variable schedules with examples' },
  { title: 'Extinction burst', body: 'What happens right before extinction works?' },
  { title: 'DTT steps', body: 'Walk me through a discrete trial from start to finish' },
  { title: 'Ethics mnemonic', body: 'Give me a mnemonic for the BACB ethics code' },
];

export const tutorMessages = [
  { id: '1', author: 'user', body: 'What is a fixed ratio schedule?' },
  { id: '2', author: 'assistant', body: 'A fixed ratio (FR) schedule delivers reinforcement after a set number of responses. FR5 means every 5th correct response gets reinforced. It produces high, steady rates of behavior with a brief pause after each reinforcer.' },
];

export const pricingPlans = [
  {
    id: 'free', title: 'Free', price: '$0 / month', featured: false,
    description: 'Start studying with no commitment.',
    features: ['15 practice questions/day', '15 flashcards/day', 'Basic analytics'],
  },
  {
    id: 'monthly', title: 'Pro Monthly', price: '$9.99 / month', featured: false,
    description: 'Full access billed monthly.',
    features: ['Unlimited practice questions', 'All mock exams', 'Full flashcards access', 'Full analytics'],
  },
  {
    id: 'yearly', title: 'Pro Annual', price: '$59.99 / year', featured: true,
    description: 'Best value — 2 months free.',
    features: ['Everything in Pro Monthly', '2 months free vs monthly', 'Priority support'],
  },
];

export const profileActions = [
  { title: 'Notifications', body: 'Daily study reminders' },
  { title: 'Language', body: 'English / Español' },
  { title: 'Privacy Policy', body: 'How we handle your data' },
  { title: 'Terms of Service', body: 'Usage and legal info' },
];
