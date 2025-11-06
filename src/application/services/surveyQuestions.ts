export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text' | 'scale';
  options?: string[];
  required: boolean;
}

export const studentSurvey: SurveyQuestion[] = [
  {
    id: 'goal',
    question: "What's your primary goal?",
    type: 'single',
    options: ['Learn new skills', 'Get a job', 'Build a startup', 'Advance my career', 'Explore opportunities'],
    required: true,
  },
  {
    id: 'domain',
    question: 'Which domain interests you most?',
    type: 'single',
    options: ['Technology', 'Business', 'Design', 'Data Science', 'Marketing', 'Healthcare', 'Education', 'Other'],
    required: true,
  },
  {
    id: 'skillLevel',
    question: 'What is your current skill level?',
    type: 'single',
    options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    required: true,
  },
  {
    id: 'learning',
    question: 'How do you prefer to learn?',
    type: 'multiple',
    options: ['With mentor guidance', 'Self-paced courses', 'Project-based', 'Collaborative learning', 'Video tutorials'],
    required: true,
  },
  {
    id: 'timeCommitment',
    question: 'How many hours per week can you commit?',
    type: 'single',
    options: ['1-5 hours', '6-10 hours', '11-20 hours', '20+ hours'],
    required: true,
  },
  {
    id: 'expectations',
    question: 'What do you expect from this platform?',
    type: 'text',
    required: false,
  },
];

export const mentorSurvey: SurveyQuestion[] = [
  {
    id: 'expertise',
    question: 'What is your area of expertise?',
    type: 'single',
    options: ['Technology', 'Business', 'Design', 'Data Science', 'Marketing', 'Healthcare', 'Education', 'Other'],
    required: true,
  },
  {
    id: 'experience',
    question: 'How many years of professional experience do you have?',
    type: 'single',
    options: ['1-2 years', '3-5 years', '6-10 years', '10+ years'],
    required: true,
  },
  {
    id: 'availability',
    question: 'How available are you for mentoring?',
    type: 'single',
    options: ['1-2 hours/week', '3-5 hours/week', '6-10 hours/week', 'Flexible'],
    required: true,
  },
  {
    id: 'mentorshipStyle',
    question: 'What is your preferred mentorship style?',
    type: 'multiple',
    options: ['One-on-one sessions', 'Group sessions', 'Project-based guidance', 'Career advice', 'Technical coaching'],
    required: true,
  },
  {
    id: 'motivation',
    question: 'Why do you want to mentor?',
    type: 'text',
    required: true,
  },
];

export const employerSurvey: SurveyQuestion[] = [
  {
    id: 'industry',
    question: 'Which industry does your company operate in?',
    type: 'single',
    options: ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Consulting', 'Other'],
    required: true,
  },
  {
    id: 'companySize',
    question: 'What is your company size?',
    type: 'single',
    options: ['1-10 employees', '11-50 employees', '51-200 employees', '201-1000 employees', '1000+ employees'],
    required: true,
  },
  {
    id: 'hiringNeeds',
    question: 'What type of positions do you typically hire for?',
    type: 'multiple',
    options: ['Entry-level', 'Mid-level', 'Senior positions', 'Internships', 'Freelance/Contract'],
    required: true,
  },
  {
    id: 'hiringFrequency',
    question: 'How frequently do you hire?',
    type: 'single',
    options: ['Rarely', 'Few times a year', 'Monthly', 'Continuously'],
    required: true,
  },
  {
    id: 'challenges',
    question: 'What are your biggest hiring challenges?',
    type: 'text',
    required: false,
  },
];

export const investorSurvey: SurveyQuestion[] = [
  {
    id: 'focus',
    question: 'What sectors do you typically invest in?',
    type: 'multiple',
    options: ['Technology', 'Healthcare', 'Education', 'Finance', 'Consumer', 'B2B', 'Hardware', 'Other'],
    required: true,
  },
  {
    id: 'stage',
    question: 'Which investment stage do you focus on?',
    type: 'single',
    options: ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'All stages'],
    required: true,
  },
  {
    id: 'checkSize',
    question: 'What is your typical check size?',
    type: 'single',
    options: ['$10K - $50K', '$50K - $250K', '$250K - $1M', '$1M+'],
    required: true,
  },
  {
    id: 'value',
    question: 'What value do you bring to startups beyond capital?',
    type: 'text',
    required: true,
  },
];

export const entrepreneurSurvey: SurveyQuestion[] = [
  {
    id: 'stage',
    question: 'What stage is your startup at?',
    type: 'single',
    options: ['Ideation', 'MVP/Prototype', 'Early stage', 'Growth stage', 'Scaling'],
    required: true,
  },
  {
    id: 'industry',
    question: 'Which industry is your startup in?',
    type: 'single',
    options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'SaaS', 'Other'],
    required: true,
  },
  {
    id: 'needs',
    question: 'What do you need most right now?',
    type: 'multiple',
    options: ['Funding', 'Mentors', 'Co-founders', 'Customers', 'Technical support', 'Marketing'],
    required: true,
  },
  {
    id: 'progress',
    question: 'What progress have you made so far?',
    type: 'text',
    required: true,
  },
  {
    id: 'vision',
    question: 'Describe your vision for the company (briefly)',
    type: 'text',
    required: true,
  },
];

export const sponsorSurvey: SurveyQuestion[] = [
  {
    id: 'type',
    question: 'What type of sponsor are you?',
    type: 'single',
    options: ['Corporate', 'Individual', 'Foundation', 'Educational institution', 'Government'],
    required: true,
  },
  {
    id: 'focus',
    question: 'What do you want to sponsor?',
    type: 'multiple',
    options: ['Student scholarships', 'Events', 'Research', 'Infrastructure', 'Programs', 'General support'],
    required: true,
  },
  {
    id: 'impact',
    question: 'What impact are you looking to create?',
    type: 'text',
    required: true,
  },
  {
    id: 'budget',
    question: 'What is your annual sponsorship budget range?',
    type: 'single',
    options: ['Under $10K', '$10K - $50K', '$50K - $100K', '$100K+'],
    required: false,
  },
];

export const surveyData: Record<string, SurveyQuestion[]> = {
  student: studentSurvey,
  mentor: mentorSurvey,
  employer: employerSurvey,
  investor: investorSurvey,
  entrepreneur: entrepreneurSurvey,
  sponsor: sponsorSurvey,
};

