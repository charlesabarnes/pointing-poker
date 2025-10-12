import { Component, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartOptions, ChartType } from 'chart.js';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';
import { create } from 'canvas-confetti';
import { BaseChartDirective } from 'ng2-charts';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock } from '@fortawesome/pro-solid-svg-icons';
import { PokerSessionStateService } from '../../services/poker-session-state.service';
import { PokerWebSocketService } from '../../services/poker-websocket.service';

// Confetti canvas
const createConfettiCanvas = create(undefined, { useWorker: true, resize: true });

@Component({
  selector: 'app-results-chart',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    FontAwesomeModule
  ],
  templateUrl: './results-chart.component.html',
  styleUrls: ['./results-chart.component.scss']
})
export class ResultsChartComponent {
  // Icon
  faClock = faClock;

  // Chart configuration
  public chartType: ChartType = 'pie';
  public plugins = [pluginDataLabels];
  public colors = ['#4A89DC', '#8CC152', '#DA4453', '#F6B042', '#2F384F', '#282828', '#662255', '#454EA0'];

  public chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff',
          font: {
            size: 16
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: {
          size: 20,
        },
        formatter: (_value, ctx) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label;
        },
      },
    }
  };

  // Computed signals for chart data
  public chartData = computed(() => {
    const pointValueCounts = this.getPointValueCountObject();
    const data: number[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValueCounts[pointValue]);
      }
    }

    // Trigger confetti if consensus is reached
    if (Object.keys(pointValueCounts).length === 1 && !this.stateService.confettiShot()) {
      createConfettiCanvas({
        shapes: ['square'],
        particleCount: 100,
        spread: 70,
        angle: 42,
      });
      this.stateService.markConfettiShot();
    }

    return data;
  });

  public chartLabels = computed(() => {
    const pointValueCounts = this.getPointValueCountObject();
    const data: string[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValue);
      }
    }
    return data;
  });

  constructor(
    public stateService: PokerSessionStateService,
    private wsService: PokerWebSocketService
  ) {
    // Effect to set confetti flag when chart appears
    effect(() => {
      if (this.stateService.showChart()) {
        this.stateService.markConfettiShot();
      }
    });
  }

  private getPointValueCountObject(): Record<string, number> {
    let pointValueCounts: Record<string, number> = {};
    let point: number;
    const values = this.wsService.pointValues();
    for (const user in values) {
      if (values.hasOwnProperty(user) && values[user] !== 'disconnect' && values[user]) {
        point = values[user] as number;
        pointValueCounts[point] = pointValueCounts[point] ? pointValueCounts[point] + 1 : 1;
      }
    }
    return pointValueCounts;
  }

  /**
   * Generate accessible description of chart data for screen readers
   */
  public getChartAccessibleDescription(): string {
    const pointValueCounts = this.getPointValueCountObject();
    const entries = Object.entries(pointValueCounts);

    if (entries.length === 0) {
      return 'No votes recorded yet';
    }

    if (entries.length === 1) {
      const [value, count] = entries[0];
      return `Consensus reached: ${count} vote${count > 1 ? 's' : ''} for ${value} points`;
    }

    const description = entries
      .map(([value, count]) => `${value} points: ${count} vote${count > 1 ? 's' : ''}`)
      .join(', ');

    return `Voting results chart showing: ${description}`;
  }
}
