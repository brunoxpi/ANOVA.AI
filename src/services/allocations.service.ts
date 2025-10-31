import { Injectable, signal } from '@angular/core';
// FIX: Added OrderTimelineEvent to the import to resolve type errors.
import { Client, OnboardingStatus, Asset, Order, OrderStatus, OrderTimelineEventType, OrderTimelineEvent } from '../types';

@Injectable({
  providedIn: 'root',
})
export class AllocationsService {
  private clients = signal<Client[]>([
    { account: '8574921', name: 'Marcelo Vitor Goncalves', assessor: 'Maria Oliveira', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 150000, patrimonioTotal: 175000, registrationDate: '21/10/2025', riskProfile: 'Moderado', portfolioStartDate: '15/01/2023', allocatedPortfolio: 'Carteira Moderada Plus', adminFee: '1.0% a.a.', performanceFee: '15% do que exceder o CDI' },
    { account: '10984572', name: 'Ana Paula Costa', assessor: 'Carlos Mendes', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 25000, patrimonioTotal: 45000, registrationDate: '20/10/2025', riskProfile: 'Conservador', portfolioStartDate: '02/03/2024', allocatedPortfolio: 'Carteira Conservadora RF', adminFee: '0.8% a.a.', performanceFee: 'N/A' },
    { account: '33450912', name: 'Pedro Henrique Lima', assessor: 'Juliana Ferreira', status: OnboardingStatus.InProgress, progress: 1, totalSteps: 4, balance: 0, patrimonioTotal: 0, registrationDate: '19/10/2025', riskProfile: 'Moderado', portfolioStartDate: '20/05/2024', allocatedPortfolio: 'Carteira de Crescimento', adminFee: '1.2% a.a.', performanceFee: '20% do que exceder o IBOV' },
    { account: '72103465', name: 'Mariana Souza Alves', assessor: 'Roberto Santos', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 50000, patrimonioTotal: 120000, registrationDate: '16/10/2025', riskProfile: 'Arrojado', portfolioStartDate: '10/11/2022', allocatedPortfolio: 'Carteira Arrojada Global', adminFee: '1.5% a.a.', performanceFee: '20% do que exceder o S&P 500' },
    { account: '50672198', name: 'Lucas Rodrigues Martins', assessor: 'Fernanda Dias', status: OnboardingStatus.Completed, progress: 4, totalSteps: 4, balance: 100000, patrimonioTotal: 250000, registrationDate: '12/10/2025', riskProfile: 'Conservador', portfolioStartDate: '05/06/2023', allocatedPortfolio: 'Carteira Conservadora Plus', adminFee: '0.9% a.a.', performanceFee: '10% do que exceder o CDI' },
    { account: '98765432', name: 'Beatriz Carvalho Nunes', assessor: 'Ricardo Gomes', status: OnboardingStatus.InProgress, progress: 3, totalSteps: 4, balance: 0, patrimonioTotal: 15000, registrationDate: '11/10/2025', riskProfile: 'Moderado', portfolioStartDate: '01/02/2024', allocatedPortfolio: 'Carteira Moderada Equilibrada', adminFee: '1.1% a.a.', performanceFee: '15% do que exceder o CDI' },
  ]);

  private assets = signal<Asset[]>([
    { id: 'CDB001', name: 'CDB Pré-fixado Banco Master 15% a.a.', type: 'CDB', issuer: 'Banco Master', rate: '15% a.a.', category: 'Pública', risk: 'Baixo', minAmount: 1000, expiry: '20/10/2028' },
    { id: 'LCI001', name: 'LCI IPCA+ 6.5% Banco Inter', type: 'LCI', issuer: 'Banco Inter', rate: 'IPCA+6.5%', category: 'Pública', risk: 'Baixo', minAmount: 5000, expiry: '15/05/2026' },
    { id: 'PETR4', name: 'Petrobras PN', type: 'Ação', issuer: 'Petrobras', rate: 'N/A', category: 'Pública', risk: 'Alto', minAmount: 100 },
    { id: 'VALE3', name: 'Vale ON', type: 'Ação', issuer: 'Vale', rate: 'N/A', category: 'Pública', risk: 'Alto', minAmount: 100 },
    { id: 'FUNDO01', name: 'BTG Pactual Ações USA FIM', type: 'Fundo', issuer: 'BTG Pactual', rate: 'N/A', category: 'Pública', risk: 'Médio', minAmount: 1000 },
    { id: 'CRA001', name: 'CRA Agrícola Sol Forte', type: 'CDB', issuer: 'Sol Forte Securitizadora', rate: 'IPCA+8.5%', category: 'Privada', risk: 'Médio', minAmount: 25000, expiry: '10/01/2030' },
    { id: 'DEB001', name: 'Debênture Incentivada Energia Limpa', type: 'Fundo', issuer: 'Omega Energia', rate: 'IPCA+7.2%', category: 'Privada', risk: 'Médio', minAmount: 10000, expiry: '01/03/2032' },
  ]);

  private orders = signal<Order[]>([
    {
      id: 'ORD-001', client: this.clients()[0], createdDate: '22/10/2025 10:30', status: OrderStatus.Executada, totalValue: 25000, isFavorite: true,
      hub: 'Matriz', assunto: 'Renda Fixa', tipo: 'Aplicação',
      assets: [{ asset: this.assets()[0], amount: 15000 }, { asset: this.assets()[4], amount: 10000 }],
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '22/10/2025 10:00', content: 'Ordem criada por Maria Oliveira.' },
        { id: 2, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '22/10/2025 10:05', content: 'Status alterado para Em Tratamento.' },
        { id: 3, type: OrderTimelineEventType.Comment, author: 'Maria Oliveira', timestamp: '22/10/2025 10:15', content: 'Cliente confirmou a alocação por telefone.' },
        { id: 4, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '22/10/2025 10:30', content: 'Status alterado para Executada.' }
      ]
    },
    {
      id: 'ORD-002', client: this.clients()[1], createdDate: '22/10/2025 09:15', status: OrderStatus.Aberta, totalValue: 10000, isFavorite: false,
      hub: 'Filial SP', assunto: 'Renda Variável', tipo: 'Resgate',
      assets: [{ asset: this.assets()[1], amount: 10000 }],
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '22/10/2025 09:15', content: 'Ordem criada por Carlos Mendes.' },
      ]
    },
    {
      id: 'ORD-003', client: this.clients()[2], createdDate: '21/10/2025 15:00', status: OrderStatus.EmTratamento, totalValue: 50000, isFavorite: false,
       hub: 'Matriz', assunto: 'Renda Fixa', tipo: 'Aplicação',
      assets: [{ asset: this.assets()[2], amount: 25000 }, { asset: this.assets()[3], amount: 25000 }],
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '21/10/2025 14:30', content: 'Ordem criada por Roberto Santos.' },
        { id: 2, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '21/10/2025 15:00', content: 'Status alterado para Em Tratamento.' },
      ]
    },
    {
      id: 'ORD-004', client: this.clients()[3], createdDate: '20/10/2025 11:45', status: OrderStatus.Fechada, totalValue: 5000, isFavorite: false,
      hub: 'Filial RJ', assunto: 'Fundos', tipo: 'Aplicação',
      assets: [{ asset: this.assets()[4], amount: 5000 }],
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '20/10/2025 11:00', content: 'Ordem criada por Roberto Santos.' },
        { id: 2, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '20/10/2025 11:45', content: 'Status alterado para Fechada.' },
      ]
    },
     {
      id: 'ORD-005', client: this.clients()[4], createdDate: '19/10/2025 16:20', status: OrderStatus.Rejeitada, totalValue: 100000, isFavorite: false,
      hub: 'Matriz', assunto: 'Renda Fixa', tipo: 'Resgate',
      assets: [{ asset: this.assets()[0], amount: 100000 }],
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '19/10/2025 16:20', content: 'Status alterado para Rejeitada.' },
      ]
    },
     {
      id: 'ORD-006', client: this.clients()[5], createdDate: '18/10/2025 14:10', status: OrderStatus.ComPendencia, totalValue: 75000, isFavorite: false,
      hub: 'Filial SP', assunto: 'Renda Variável', tipo: 'Aplicação',
      assets: [{ asset: this.assets()[2], amount: 75000 }],
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: '18/10/2025 14:10', content: 'Status alterado para Com Pendência.' },
      ]
    },
  ]);

  getClients() {
    return this.clients.asReadonly();
  }

  getAssets() {
    return this.assets.asReadonly();
  }

  getAssetById(id: string) {
    return this.assets().find(a => a.id === id);
  }

  getOrders() {
    return this.orders.asReadonly();
  }

  getOrderById(id: string) {
    return this.orders().find(o => o.id === id);
  }

  toggleFavorite(orderId: string) {
    this.orders.update(orders =>
      orders.map(order =>
        order.id === orderId ? { ...order, isFavorite: !order.isFavorite } : order
      )
    );
  }

  addOrder(order: Omit<Order, 'id' | 'createdDate' | 'isFavorite' | 'timeline' | 'hub' | 'assunto' | 'tipo'>) {
    const newOrder: Order = {
      ...order,
      id: `ORD-${String(this.orders().length + 1).padStart(3, '0')}`,
      createdDate: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      isFavorite: false,
      hub: 'Matriz', // Default value
      assunto: 'Renda Fixa', // Default value
      tipo: 'Aplicação', // Default value
      timeline: [
        { id: 1, type: OrderTimelineEventType.Log, author: 'Sistema', timestamp: new Date().toLocaleString('pt-BR'), content: `Ordem criada por ${order.client.assessor}.` }
      ]
    };
    this.orders.update(orders => [newOrder, ...orders]);
  }

  updateOrderStatus(orderId: string, status: OrderStatus, reason?: string) {
    this.orders.update(orders => orders.map(order => {
      if (order.id !== orderId) return order;
      
      const newEvent: OrderTimelineEvent = {
        id: order.timeline.length + 1,
        type: OrderTimelineEventType.Log,
        author: 'Sistema',
        timestamp: new Date().toLocaleString('pt-BR'),
        content: `Status alterado para ${status}${reason ? `: ${reason}` : '.'}`
      };

      return { ...order, status, timeline: [...order.timeline, newEvent] };
    }));
  }

  addCommentToOrder(orderId: string, author: string, comment: string) {
      this.orders.update(orders => orders.map(order => {
        if (order.id !== orderId) return order;

        const newEvent: OrderTimelineEvent = {
            id: order.timeline.length + 1,
            type: OrderTimelineEventType.Comment,
            author: author,
            timestamp: new Date().toLocaleString('pt-BR'),
            content: comment,
        };
        return { ...order, timeline: [...order.timeline, newEvent] };
      }));
  }
}