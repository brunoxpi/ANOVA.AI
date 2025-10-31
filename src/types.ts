export enum OnboardingStatus {
  InProgress = 'Em Andamento',
  Completed = 'Concluído',
}

export interface Client {
  account: string;
  name: string;
  assessor: string;
  status: OnboardingStatus;
  progress: number;
  totalSteps: number;
  balance: number;
  registrationDate: string;
  annotations?: string;
  riskProfile?: 'Conservador' | 'Moderado' | 'Arrojado';
  patrimonioTotal?: number;
  portfolioStartDate?: string;
  allocatedPortfolio?: string;
  adminFee?: string;
  performanceFee?: string;
}

export enum OrderStatus {
  Aberta = 'Aberta',
  ComPendencia = 'Com Pendência',
  EmTratamento = 'Em Tratamento',
  Executada = 'Executada',
  Rejeitada = 'Rejeitada',
  Fechada = 'Fechada',
}

export interface Asset {
  id: string;
  name: string;
  type: 'CDB' | 'Ação' | 'Fundo' | 'LCI';
  issuer: string;
  rate: string;
  category: 'Pública' | 'Privada';
  risk: 'Baixo' | 'Médio' | 'Alto';
  minAmount: number;
  expiry?: string; // Optional expiry date for fixed income
}

export enum OrderTimelineEventType {
  Log = 'Log',
  Comment = 'Comment',
  File = 'File',
}

export interface OrderTimelineEvent {
  id: number;
  type: OrderTimelineEventType;
  author: string;
  timestamp: string;
  content: string;
  fileName?: string; // For File type
}

export interface Order {
  id: string;
  client: Client;
  createdDate: string;
  status: OrderStatus;
  totalValue: number;
  assets: { asset: Asset; amount: number }[];
  isFavorite: boolean;
  timeline: OrderTimelineEvent[];
  hub: string;
  assunto: string;
  tipo: 'Aplicação' | 'Resgate';
}