import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';

@Component({
  selector: 'app-timer-display',
  imports: [CommonModule],
  templateUrl: './timer-display.component.html',
  styleUrl: './timer-display.component.scss',
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
