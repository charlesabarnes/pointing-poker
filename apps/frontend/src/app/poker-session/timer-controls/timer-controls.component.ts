import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock, faPlay, faPause, faStop, faPlus } from '@fortawesome/pro-solid-svg-icons';
import { SessionStateService } from '../../services/session-state.service';

interface TimerDurationOption {
  label: string;
  seconds: number;
}

@Component({
  selector: 'app-timer-controls',
  imports: [
    CommonModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    FontAwesomeModule
  ],
  template: `
    <div class="timer-controls">
      @if (timerStatus() === 'idle') {
        <mat-form-field appearance="outline" class="duration-select">
          <mat-label>Timer Duration</mat-label>
          <mat-select [value]="selectedDuration()" (selectionChange)="selectedDuration.set($event.value)">
            @for (option of durationOptions; track option.seconds) {
              <mat-option [value]="option.seconds">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="onStartTimer()">
          <fa-icon [icon]="faPlay" />
          Start Timer
        </button>
      } @else {
        <div class="active-controls">
          @if (timerStatus() === 'running') {
            <button mat-raised-button (click)="onPauseTimer()">
              <fa-icon [icon]="faPause" />
              Pause
            </button>
          } @else {
            <button mat-raised-button color="primary" (click)="onResumeTimer()">
              <fa-icon [icon]="faPlay" />
              Resume
            </button>
          }
          <button mat-raised-button color="warn" (click)="onStopTimer()">
            <fa-icon [icon]="faStop" />
            Stop
          </button>
          <button mat-raised-button [matMenuTriggerFor]="extendMenu">
            <fa-icon [icon]="faPlus" />
            Extend
          </button>
          <mat-menu #extendMenu="matMenu">
            <button mat-menu-item (click)="onExtendTimer(30)">+30 seconds</button>
            <button mat-menu-item (click)="onExtendTimer(60)">+1 minute</button>
            <button mat-menu-item (click)="onExtendTimer(120)">+2 minutes</button>
          </mat-menu>
        </div>
      }
    </div>
  `,
  styles: [`
    .timer-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      padding: 0.5rem 0;
    }

    .duration-select {
      width: 180px;
    }

    .active-controls {
      display: flex;
      gap: 0.5rem;
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimerControlsComponent {
  private stateService = inject(SessionStateService);

  faClock = faClock;
  faPlay = faPlay;
  faPause = faPause;
  faStop = faStop;
  faPlus = faPlus;

  timerStatus = this.stateService.timerStatus;
  selectedDuration = signal<number>(60);

  durationOptions: TimerDurationOption[] = [
    { label: '30 seconds', seconds: 30 },
    { label: '1 minute', seconds: 60 },
    { label: '2 minutes', seconds: 120 },
    { label: '3 minutes', seconds: 180 },
    { label: '5 minutes', seconds: 300 },
    { label: '10 minutes', seconds: 600 }
  ];

  onStartTimer(): void {
    this.stateService.startTimer(this.selectedDuration());
  }

  onPauseTimer(): void {
    this.stateService.pauseTimer();
  }

  onResumeTimer(): void {
    this.stateService.resumeTimer();
  }

  onStopTimer(): void {
    this.stateService.stopTimer();
  }

  onExtendTimer(seconds: number): void {
    this.stateService.extendTimer(seconds);
  }
}
