/**
 * Seed data for initial candidates.
 * Run via: npx ts-node -r tsconfig-paths/register src/data/seed-candidates.ts
 * Or call the seed endpoint POST /api/game/seed
 *
 * Replace placeholder names with real candidate data when available.
 */

import { CandidateRole } from '../game/schemas/candidate.schema';

export interface SeedCandidate {
  name: string;
  role: CandidateRole;
  state?: string;
  imageUrl?: string;
  party?: string;
}

export const PRESIDENTIAL_CANDIDATES: SeedCandidate[] = [
  { name: 'Bola Tinubu', role: CandidateRole.PRESIDENT, imageUrl: '', party: 'APC' },
  { name: 'Atiku Abubakar', role: CandidateRole.PRESIDENT, imageUrl: '', party: 'PDP' },
  { name: 'Peter Obi', role: CandidateRole.PRESIDENT, imageUrl: '', party: 'LP' },
  { name: 'Rabiu Kwankwaso', role: CandidateRole.PRESIDENT, imageUrl: '', party: 'NNPP' },
  { name: 'Omoyele Sowore', role: CandidateRole.PRESIDENT, imageUrl: '', party: 'AAC' },
];

/**
 * Sample gubernatorial candidates — add more per state as needed.
 * These are placeholder names; replace with real candidates.
 */
export const GUBERNATORIAL_CANDIDATES: SeedCandidate[] = [
  // Lagos
  { name: 'Candidate A (Lagos)', role: CandidateRole.GOVERNOR, state: 'Lagos', imageUrl: '', party: 'APC' },
  { name: 'Candidate B (Lagos)', role: CandidateRole.GOVERNOR, state: 'Lagos', imageUrl: '', party: 'PDP' },
  { name: 'Candidate C (Lagos)', role: CandidateRole.GOVERNOR, state: 'Lagos', imageUrl: '', party: 'LP' },

  // Kano
  { name: 'Candidate A (Kano)', role: CandidateRole.GOVERNOR, state: 'Kano', imageUrl: '', party: 'NNPP' },
  { name: 'Candidate B (Kano)', role: CandidateRole.GOVERNOR, state: 'Kano', imageUrl: '', party: 'APC' },

  // Rivers
  { name: 'Candidate A (Rivers)', role: CandidateRole.GOVERNOR, state: 'Rivers', imageUrl: '', party: 'PDP' },
  { name: 'Candidate B (Rivers)', role: CandidateRole.GOVERNOR, state: 'Rivers', imageUrl: '', party: 'APC' },

  // Oyo
  { name: 'Candidate A (Oyo)', role: CandidateRole.GOVERNOR, state: 'Oyo', imageUrl: '', party: 'PDP' },
  { name: 'Candidate B (Oyo)', role: CandidateRole.GOVERNOR, state: 'Oyo', imageUrl: '', party: 'APC' },

  // FCT
  { name: 'Candidate A (FCT)', role: CandidateRole.GOVERNOR, state: 'FCT', imageUrl: '', party: 'APC' },
  { name: 'Candidate B (FCT)', role: CandidateRole.GOVERNOR, state: 'FCT', imageUrl: '', party: 'PDP' },

  // Kaduna
  { name: 'Candidate A (Kaduna)', role: CandidateRole.GOVERNOR, state: 'Kaduna', imageUrl: '', party: 'APC' },
  { name: 'Candidate B (Kaduna)', role: CandidateRole.GOVERNOR, state: 'Kaduna', imageUrl: '', party: 'PDP' },

  // Anambra
  { name: 'Candidate A (Anambra)', role: CandidateRole.GOVERNOR, state: 'Anambra', imageUrl: '', party: 'APGA' },
  { name: 'Candidate B (Anambra)', role: CandidateRole.GOVERNOR, state: 'Anambra', imageUrl: '', party: 'YPP' },

  // Delta
  { name: 'Candidate A (Delta)', role: CandidateRole.GOVERNOR, state: 'Delta', imageUrl: '', party: 'PDP' },
  { name: 'Candidate B (Delta)', role: CandidateRole.GOVERNOR, state: 'Delta', imageUrl: '', party: 'APC' },
];

export const ALL_SEED_CANDIDATES: SeedCandidate[] = [
  ...PRESIDENTIAL_CANDIDATES,
  ...GUBERNATORIAL_CANDIDATES,
];
