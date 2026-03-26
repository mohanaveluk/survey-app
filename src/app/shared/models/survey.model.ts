import { User } from "./auth.model";

export interface Party {
  id?: string;
  name: string;
  color?: string;
  leader_name?: string;
  logo_url?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface Survey {
  id: string;
  name: string;
  description?: string;
  parties: Party[];
  partyIds?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  totalVotes: number;
  status: 'draft' | 'published' | 'closed';
  isAnonymous: boolean;
  startDate: Date;
  endDate: Date;  
  surveyParties?: SurveyParty[];
  votes?: Vote[];
  creator?: User
}

export interface SurveyParty {
  party: Party;
  id: string;
  votes: number;
}

export interface Vote {
  id: string;
  surveyId: string;
  partyId: string;
  voterEmail: string;
  votedAt: Date;
  gender?: 'male' | 'female' | 'other';
  age?: number;
  location?: string;  
}

export interface TemporaryVote {
  expiresAt: Date;
  tempVoteId: string;
  surveyId: string;
  partyId: string;
  voterEmail: string;
  verificationCode: string;
}


export interface SurveyResult {
  survey: Survey;
  votes: { [partyId: string]: number };
  totalVotes: number;
}

export interface SurveyStatistics {
  survey: Survey;
  totalVotes: number;
  votesByParty: { [partyId: string]: number };
  votesByGender: {
    male: number;
    female: number;
    other: number;
  };
  genderByParty: {
    [partyId: string]: {
      male: number;
      female: number;
      other: number;
    };
  };
  votingTrend: {
    date: Date;
    count: number;
  }[];
  participationRate: number;
}