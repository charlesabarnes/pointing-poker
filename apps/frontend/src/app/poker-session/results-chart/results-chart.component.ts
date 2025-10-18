import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartOptions, ChartType } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { BaseChartDirective } from 'ng2-charts';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock } from '@fortawesome/pro-solid-svg-icons';
import { SessionStateService } from '../../services/session-state.service';
import { aggregateVotes } from '../../utils/vote-aggregator';

@Component({
  selector: 'app-results-chart',
  imports: [
    CommonModule,
    BaseChartDirective,
    FontAwesomeModule
  ],
  templateUrl: './results-chart.component.html',
  styleUrls: ['./results-chart.component.scss']
})
export class ResultsChartComponent {
  faClock = faClock;

  public stateService = inject(SessionStateService);

  public chartType: ChartType = 'pie';
  public plugins = [ChartDataLabels];
  public colors = ['#4A89DC', '#8CC152', '#DA4453', '#F6B042', '#2F384F', '#282828', '#662255', '#454EA0'];

  public chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#212121',
          font: {
            size: 14
          }
        }
      },
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          size: 18,
          weight: 'bold',
        },
        formatter: (_value, ctx) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label;
        },
      },
    }
  };

  public chartData = computed(() => {
    const pointValueCounts = this.getPointValueCountObject();
    const data: number[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValueCounts[pointValue]);
      }
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

  private getPointValueCountObject(): Record<string, number> {
    const values = this.stateService.pointValues();
    return aggregateVotes(values);
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
