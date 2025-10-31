import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AllocationsService } from '../../services/allocations.service';
import { Client, Asset } from '../../types';
import { NotificationService } from '../../services/notification.service';
import { DecimalPipe, DatePipe } from '@angular/common';

declare var Chart: any;

// --- Interfaces for Mock Data ---
interface ClientPosition {
  asset: Asset;
  corretora: 'XP' | 'BTG Pactual' | 'Avenue' | 'Safra';
  estrategia: string;
  precoEntrada: number;
  precoAtual: number;
  rentabilidade: number;
  valorTotal: number;
  quantidade: number;
  tipo: 'Renda Fixa' | 'Renda Variável' | 'Fundos' | 'Conta Corrente';
}

interface ClientMovement {
  date: Date;
  type: 'Aplicação' | 'Resgate' | 'Depósito' | 'Retirada';
  description: string;
  value: number;
}

interface PortfolioData {
  positions: ClientPosition[];
  movements: ClientMovement[];
  performance: { month: string; clientReturn: number; benchmarkReturn: number }[];
  summary: {
    'Renda Fixa': number;
    'Renda Variável': number;
    'Fundos': number;
    'Conta Corrente': number;
  };
}

type SortableColumn = 'asset' | 'corretora' | 'precoAtual' | 'rentabilidade' | 'valorTotal';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DatePipe],
})
export class PortfolioComponent {
  private allocationsService = inject(AllocationsService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // --- State Signals ---
  isLoading = signal(false);
  clientSearchTerm = signal('');
  selectedClient = signal<Client | null>(null);
  portfolioData = signal<PortfolioData | null>(null);
  
  activeBrokerageFilter = signal<'Consolidado' | 'XP' | 'BTG Pactual' | 'Avenue' | 'Safra'>('Consolidado');
  activeMovementsFilter = signal<'7d' | '30d' | '12m'>('30d');
  
  isDetailsExpanded = signal(false);
  sortState = signal<{ column: SortableColumn, direction: 'asc' | 'desc' }>({ column: 'valorTotal', direction: 'desc' });
  expandedPositionId = signal<string | null>(null);
  
  // --- Chart Signals & Elements ---
  allocationChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('allocationChartCanvas');
  performanceChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('performanceChartCanvas');
  breakdownChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('breakdownChartCanvas');

  private allocationChart: any;
  private performanceChart: any;
  private breakdownChart: any;
  selectedAllocationCategory = signal<keyof PortfolioData['summary'] | null>(null);

  // --- Data Signals ---
  allClients = this.allocationsService.getClients();
  allAssets = this.allocationsService.getAssets();

  // --- Computed Signals ---
  filteredClients = computed(() => {
    const term = this.clientSearchTerm().toLowerCase();
    if (!term) return [];
    return this.allClients().filter(c => 
      c.name.toLowerCase().includes(term) || c.account.includes(term)
    );
  });

  filteredPositions = computed(() => {
    const data = this.portfolioData();
    if (!data) return [];
    
    let positions = this.activeBrokerageFilter() === 'Consolidado'
      ? data.positions
      : data.positions.filter(p => p.corretora === this.activeBrokerageFilter());
      
    const state = this.sortState();
    if (state) {
      positions = [...positions].sort((a, b) => {
        let valA, valB;
        if (state.column === 'asset') {
          valA = a.asset.name;
          valB = b.asset.name;
        } else {
          valA = a[state.column];
          valB = b[state.column];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return state.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return state.direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
      });
    }

    return positions;
  });
  
  filteredMovements = computed(() => {
    const data = this.portfolioData();
    if (!data) return [];
    
    const now = new Date();
    const filter = this.activeMovementsFilter();
    let limitDate = new Date();

    switch(filter) {
        case '7d': limitDate.setDate(now.getDate() - 7); break;
        case '30d': limitDate.setDate(now.getDate() - 30); break;
        case '12m': limitDate.setFullYear(now.getFullYear() - 1); break;
    }

    return data.movements.filter(m => m.date >= limitDate);
  });

  movementSummary = computed(() => {
    const movements = this.filteredMovements();
    const summary = { entradas: 0, saidas: 0 };
    for (const move of movements) {
      if (move.type === 'Aplicação' || move.type === 'Depósito') {
        summary.entradas += move.value;
      } else {
        summary.saidas += move.value;
      }
    }
    return summary;
  });
  
  patrimonioSummary = computed(() => {
    const data = this.portfolioData();
    if (!data) return { 'Renda Fixa': 0, 'Fundos': 0, 'Renda Variável': 0 };
    
    const filtered = this.activeBrokerageFilter() === 'Consolidado' 
      ? data.positions 
      : data.positions.filter(p => p.corretora === this.activeBrokerageFilter());

    return {
      'Renda Fixa': filtered.filter(p => p.tipo === 'Renda Fixa').reduce((sum, p) => sum + p.valorTotal, 0),
      'Fundos': filtered.filter(p => p.tipo === 'Fundos').reduce((sum, p) => sum + p.valorTotal, 0),
      'Renda Variável': filtered.filter(p => p.tipo === 'Renda Variável').reduce((sum, p) => sum + p.valorTotal, 0),
    };
  });

  constructor() {
    effect(() => {
      if (this.selectedClient()) {
        this.destroyCharts();
        if (this.allocationChartCanvas()) this.createAllocationChart();
        if (this.performanceChartCanvas()) this.createPerformanceChart();
      }
    });

    effect(() => {
      if (this.breakdownChartCanvas()) {
        this.createBreakdownChart();
      } else {
        this.breakdownChart?.destroy();
      }
    });
  }

  selectClient(client: Client) {
    this.isLoading.set(true);
    this.selectedClient.set(client);
    this.clientSearchTerm.set('');
    // Simulate API call to fetch and process data
    setTimeout(() => {
        this.portfolioData.set(this.generateMockPortfolioData(client));
        this.isLoading.set(false);
    }, 1200);
  }

  clearClient() {
    this.selectedClient.set(null);
    this.portfolioData.set(null);
    this.selectedAllocationCategory.set(null);
    this.destroyCharts();
  }
  
  handleSort(column: SortableColumn) {
    const current = this.sortState();
    if (current?.column === column) {
      this.sortState.set({ column, direction: current.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      this.sortState.set({ column, direction: 'desc' });
    }
  }
  
  toggleExpand(assetId: string) {
    this.expandedPositionId.update(current => current === assetId ? null : assetId);
  }
  
  getRiskBadgeClass(risk: 'Baixo' | 'Médio' | 'Alto'): string {
    switch (risk) {
      case 'Baixo': return 'bg-status-success/20 text-status-success';
      case 'Médio': return 'bg-status-warning/20 text-status-warning';
      case 'Alto': return 'bg-status-error/20 text-status-error';
    }
  }

  createNewOrderForClient() {
    const client = this.selectedClient();
    if (client) {
      this.router.navigate(['/allocations/new'], { 
        queryParams: { clientId: client.account, path: 'direct' } 
      });
    }
  }

  private createPerformanceData(baseReturn: number, volatility: number) {
    const performance: { month: string; clientReturn: number; benchmarkReturn: number }[] = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let lastClient = 100;
    let lastBench = 100;
    for (let i = 0; i < 12; i++) {
        lastClient *= (1 + (baseReturn - volatility / 2 + Math.random() * volatility) / 100);
        lastBench *= (1 + (0.8 + Math.random() * 0.4) / 100); // CDI simulation
        performance.push({ 
            month: months[(new Date().getMonth() - 11 + i + 12) % 12], 
            clientReturn: lastClient, 
            benchmarkReturn: lastBench 
        });
    }
    return performance;
  }
  
  private generateRandomPortfolioData(client: Client): PortfolioData {
    const positions: ClientPosition[] = [];
    const summary: PortfolioData['summary'] = { 'Renda Fixa': 0, 'Renda Variável': 0, 'Fundos': 0, 'Conta Corrente': client.balance };
    const availableAssets = [...this.allAssets()];
    const numPositions = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numPositions; i++) {
        if (availableAssets.length === 0) break;
        const assetIndex = Math.floor(Math.random() * availableAssets.length);
        const asset = availableAssets.splice(assetIndex, 1)[0];
        
        const valorTotal = asset.minAmount + Math.random() * 50000;
        const rentabilidade = -5 + Math.random() * 20;
        const precoAtual = 100 + Math.random() * 100;
        const precoEntrada = precoAtual / (1 + rentabilidade / 100);

        let tipo: ClientPosition['tipo'] = 'Fundos';
        if (asset.type === 'CDB' || asset.type === 'LCI') tipo = 'Renda Fixa';
        if (asset.type === 'Ação') tipo = 'Renda Variável';

        positions.push({
            asset,
            corretora: (['XP', 'BTG Pactual', 'Avenue'] as const)[Math.floor(Math.random() * 3)],
            estrategia: 'Longo Prazo', precoEntrada, precoAtual, rentabilidade, valorTotal,
            quantidade: Math.floor(valorTotal / precoAtual), tipo
        });
        summary[tipo] += valorTotal;
    }

    const movements: ClientMovement[] = [];
    const numMovements = 10 + Math.floor(Math.random() * 10);
    const movementTypes: ClientMovement['type'][] = ['Aplicação', 'Resgate', 'Depósito', 'Retirada'];
    for (let i = 0; i < numMovements; i++) {
        const type = movementTypes[Math.floor(Math.random() * movementTypes.length)];
        let description = 'Movimentação Genérica';
        if (type === 'Aplicação' && positions.length > 0) {
            description = `Aplicação ${positions[Math.floor(Math.random() * positions.length)].asset.type}`;
        } else if (type === 'Resgate' && positions.length > 0) {
            description = `Resgate ${positions[Math.floor(Math.random() * positions.length)].asset.type}`;
        } else if (type === 'Depósito') {
            description = 'Depósito em Conta';
        } else if (type === 'Retirada') {
            description = 'Retirada para Despesas';
        }
        movements.push({
            date: new Date(new Date().setDate(new Date().getDate() - i * (5 + Math.floor(Math.random() * 10)))),
            type: type,
            description: description,
            value: 500 + Math.random() * 4500
        });
    }

    return { positions, movements, performance: this.createPerformanceData(0.9, 3.0), summary };
  }

  private generateMockPortfolioData(client: Client): PortfolioData {
    const assets = this.allAssets();
    const findAsset = (id: string): Asset => assets.find(a => a.id === id)!;

    // --- Predefined Portfolios for Key Clients ---
    switch (client.account) {
      case '8574921': // Marcelo Vitor Goncalves (Moderado)
        return {
            positions: [
                { asset: findAsset('CDB001'), corretora: 'XP', estrategia: 'Longo Prazo', precoEntrada: 980.50, precoAtual: 1050.75, rentabilidade: 7.16, valorTotal: 52537.50, quantidade: 50, tipo: 'Renda Fixa' },
                { asset: findAsset('LCI001'), corretora: 'BTG Pactual', estrategia: 'Longo Prazo', precoEntrada: 4950.00, precoAtual: 5120.00, rentabilidade: 3.43, valorTotal: 25600.00, quantidade: 5, tipo: 'Renda Fixa' },
                { asset: findAsset('PETR4'), corretora: 'XP', estrategia: 'Tático', precoEntrada: 35.40, precoAtual: 38.90, rentabilidade: 9.89, valorTotal: 38900.00, quantidade: 1000, tipo: 'Renda Variável' },
                { asset: findAsset('VALE3'), corretora: 'XP', estrategia: 'Longo Prazo', precoEntrada: 60.10, precoAtual: 65.20, rentabilidade: 8.49, valorTotal: 32600.00, quantidade: 500, tipo: 'Renda Variável' },
                { asset: findAsset('FUNDO01'), corretora: 'BTG Pactual', estrategia: 'Longo Prazo', precoEntrada: 15.20, precoAtual: 17.80, rentabilidade: 17.11, valorTotal: 17800.00, quantidade: 1000, tipo: 'Fundos' },
                { asset: findAsset('CRA001'), corretora: 'BTG Pactual', estrategia: 'Longo Prazo', precoEntrada: 24800.00, precoAtual: 25500.00, rentabilidade: 2.82, valorTotal: 25500.00, quantidade: 1, tipo: 'Renda Fixa' },
            ],
            movements: [
              { date: new Date('2025-10-20'), type: 'Aplicação', description: 'Aplicação CDB Master', value: 15000 },
              { date: new Date('2025-10-18'), type: 'Depósito', description: 'Depósito em Conta', value: 20000 },
              { date: new Date('2025-10-15'), type: 'Resgate', description: 'Resgate Fundo BTG', value: 5000 },
              { date: new Date('2025-10-10'), type: 'Aplicação', description: 'Compra PETR4', value: 10000 },
              { date: new Date('2025-10-05'), type: 'Retirada', description: 'Retirada para despesas', value: 2500 },
              { date: new Date('2025-09-28'), type: 'Aplicação', description: 'Aplicação LCI Inter', value: 7500 },
              { date: new Date('2025-09-20'), type: 'Depósito', description: 'Depósito em Conta', value: 15000 },
              { date: new Date('2025-09-12'), type: 'Resgate', description: 'Venda VALE3', value: 8000 },
            ],
            performance: this.createPerformanceData(1.2, 2.5),
            summary: { 'Renda Fixa': 103637.5, 'Fundos': 17800, 'Renda Variável': 71500, 'Conta Corrente': client.balance }
        };
      
      case '33450912': // Pedro Henrique Lima (Moderado, InProgress)
        return {
          positions: [
            { asset: findAsset('LCI001'), corretora: 'BTG Pactual', estrategia: 'Conservador', precoEntrada: 5000.00, precoAtual: 5080.00, rentabilidade: 1.6, valorTotal: 25400.00, quantidade: 5, tipo: 'Renda Fixa' },
            { asset: findAsset('FUNDO01'), corretora: 'BTG Pactual', estrategia: 'Moderado', precoEntrada: 16.00, precoAtual: 17.10, rentabilidade: 6.88, valorTotal: 17100.00, quantidade: 1000, tipo: 'Fundos' },
            { asset: findAsset('VALE3'), corretora: 'XP', estrategia: 'Crescimento', precoEntrada: 62.50, precoAtual: 65.20, rentabilidade: 4.32, valorTotal: 13040.00, quantidade: 200, tipo: 'Renda Variável' },
          ],
          movements: [
            { date: new Date('2025-10-19'), type: 'Depósito', description: 'Depósito inicial', value: 50000 },
            { date: new Date('2025-10-20'), type: 'Aplicação', description: 'Aplicação LCI Inter', value: 25400 },
            { date: new Date('2025-10-21'), type: 'Aplicação', description: 'Aplicação Fundo BTG', value: 17100 },
            { date: new Date('2025-10-22'), type: 'Aplicação', description: 'Compra VALE3', value: 7500 },
          ],
          performance: this.createPerformanceData(1.1, 2.0),
          summary: { 'Renda Fixa': 25400.00, 'Fundos': 17100.00, 'Renda Variável': 13040.00, 'Conta Corrente': client.balance }
        };

      case '72103465': // Mariana Souza Alves (Arrojado)
        return {
          positions: [
            { asset: findAsset('PETR4'), corretora: 'Avenue', estrategia: 'Oportunidade', precoEntrada: 33.00, precoAtual: 38.90, rentabilidade: 17.88, valorTotal: 77800.00, quantidade: 2000, tipo: 'Renda Variável' },
            { asset: findAsset('FUNDO01'), corretora: 'Avenue', estrategia: 'Global Diversificado', precoEntrada: 14.50, precoAtual: 17.80, rentabilidade: 22.76, valorTotal: 53400.00, quantidade: 3000, tipo: 'Fundos' },
            { asset: findAsset('DEB001'), corretora: 'Safra', estrategia: 'Incentivada', precoEntrada: 9950.00, precoAtual: 10300.00, rentabilidade: 3.52, valorTotal: 20600.00, quantidade: 2, tipo: 'Renda Fixa' },
            { asset: findAsset('VALE3'), corretora: 'XP', estrategia: 'Longo Prazo', precoEntrada: 58.00, precoAtual: 65.20, rentabilidade: 12.41, valorTotal: 65200.00, quantidade: 1000, tipo: 'Renda Variável' },
          ],
          movements: [
            { date: new Date('2025-10-22'), type: 'Aplicação', description: 'Compra PETR4', value: 25000 },
            { date: new Date('2025-10-20'), type: 'Resgate', description: 'Venda VALE3', value: 15000 },
            { date: new Date('2025-10-18'), type: 'Aplicação', description: 'Aplicação Debênture Omega', value: 10000 },
            { date: new Date('2025-10-15'), type: 'Depósito', description: 'Depósito em Conta', value: 30000 },
            { date: new Date('2025-10-12'), type: 'Resgate', description: 'Resgate Fundo Global', value: 5000 },
            { date: new Date('2025-10-08'), type: 'Aplicação', description: 'Compra VALE3', value: 12000 },
            { date: new Date('2025-10-05'), type: 'Aplicação', description: 'Compra PETR4', value: 18000 },
          ],
          performance: this.createPerformanceData(1.5, 4.0),
          summary: { 'Renda Fixa': 20600.00, 'Fundos': 53400.00, 'Renda Variável': 143000.00, 'Conta Corrente': client.balance }
        };
        
      default: // Fallback for other clients
        return this.generateRandomPortfolioData(client);
    }
  }
  
  private destroyCharts() {
    this.allocationChart?.destroy();
    this.performanceChart?.destroy();
    this.breakdownChart?.destroy();
  }

  private createAllocationChart() {
    const canvas = this.allocationChartCanvas()?.nativeElement;
    const data = this.portfolioData()?.summary;
    if (!canvas || !data) return;

    const chartData = {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#1A1A1A', '#6B7280', '#D1D5DB', '#F9FAFB'],
        borderColor: '#F7F8FA',
        borderWidth: 2,
      }]
    };

    this.allocationChart = new Chart(canvas, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, padding: 15, color: '#1A1A1A' } },
          tooltip: { callbacks: { label: (context) => `${context.label}: ${context.formattedValue}` } }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const clickedIndex = elements[0].index;
            const clickedLabel = chartData.labels[clickedIndex] as keyof PortfolioData['summary'];
            this.selectedAllocationCategory.update(current => current === clickedLabel ? null : clickedLabel);
          }
        }
      }
    });
  }
  
  private createBreakdownChart() {
    this.breakdownChart?.destroy();
    const canvas = this.breakdownChartCanvas()?.nativeElement;
    const category = this.selectedAllocationCategory();
    const portfolio = this.portfolioData();
    if (!canvas || !category || !portfolio) return;

    const filteredPositions = portfolio.positions.filter(p => p.tipo === category);
    
    this.breakdownChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: filteredPositions.map(p => p.asset.name),
            datasets: [{
                label: 'Valor Alocado',
                data: filteredPositions.map(p => p.valorTotal),
                backgroundColor: '#1A1A1A',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `R$ ${context.formattedValue}` } }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { display: false } }
            }
        }
    });
  }

  private createPerformanceChart() {
    const canvas = this.performanceChartCanvas()?.nativeElement;
    const data = this.portfolioData()?.performance;
    if (!canvas || !data) return;

    this.performanceChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(p => p.month),
        datasets: [
          {
            label: 'Carteira',
            data: data.map(p => p.clientReturn),
            borderColor: '#1A1A1A',
            backgroundColor: 'rgba(26, 26, 26, 0.05)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'CDI',
            data: data.map(p => p.benchmarkReturn),
            borderColor: '#10B981',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, ticks: { callback: (value: number) => (value - 100).toFixed(1) + '%' } }
        },
        plugins: {
          legend: { display: true, position: 'top', align: 'end' },
          tooltip: { mode: 'index', intersect: false }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }
}