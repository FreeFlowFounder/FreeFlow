export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal: string;
  raised: string;
  creator: string;
  contractAddress?: string;
  imageUrl?: string;
  duration: number;
  endDate: string;
  isActive: boolean;
  acceptedTokens: string[];
  createdAt: string;
  progress: number;
  timeLeft: string;
  status: 'active' | 'ended' | 'goal_met';
}

export interface Donation {
  id: string;
  campaignId: string;
  donor: string;
  amount: string;
  token: string;
  txHash: string;
  createdAt: string;
}

export interface CreateCampaignData {
  title: string;
  description: string;
  goal: string;
  duration: number;
  imageUrl?: string;
  acceptedTokens: string[];
}
