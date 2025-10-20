import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';

@Component({
  selector: 'app-timer-display',
  imports: [CommonModule],
  template: `
    @if (timerStatus() !== 'idle') {
      <div class="timer-display" [class.paused]="timerStatus() === 'paused'">
        <div class="timer-circle">
          <svg viewBox="0 0 120 120" class="timer-svg">
            <circle
              cx="60"
              cy="60"
              r="54"
              class="timer-bg"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              class="timer-progress"
              [style.stroke-dasharray]="circumference"
              [style.stroke-dashoffset]="progressOffset()"
            />
          </svg>
          <div class="timer-text">
            <div class="time">{{ formattedTime() }}</div>
            @if (timerStatus() === 'paused') {
              <div class="status">PAUSED</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .timer-display {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
    }

    .timer-circle {
      position: relative;
      width: 120px;
      height: 120px;
    }

    .timer-svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .timer-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 8;
    }

    .timer-progress {
      fill: none;
      stroke: #4caf50;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s linear, stroke 0.3s;
    }

    .paused .timer-progress {
      stroke: #ff9800;
    }

    .timer-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .time {
      font-size: 1.5rem;
      font-weight: bold;
      color: #212121;
    }

    .status {
      font-size: 0.75rem;
      color: #ff9800;
      margin-top: 0.25rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimerDisplayComponent {
  private stateService = inject(SessionStateService);

  timerStatus = this.stateService.timerStatus;
  timerDuration = this.stateService.timerDuration;
  timerRemainingTime = this.stateService.timerRemainingTime;

  circumference = 2 * Math.PI * 54;

  progressOffset = computed(() => {
    const duration = this.timerDuration();
    const remaining = this.timerRemainingTime();
    if (duration === 0) return this.circumference;
    const progress = remaining / duration;
    return this.circumference * (1 - progress);
  });

  formattedTime = computed(() => {
    const totalSeconds = this.timerRemainingTime();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });
}
