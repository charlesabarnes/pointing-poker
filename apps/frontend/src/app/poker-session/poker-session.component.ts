import { Component, OnInit, OnDestroy, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { SessionCoordinatorService } from '../services/session-coordinator.service';
import { SessionStateService } from '../services/session-state.service';
import { StoryControlsComponent } from './story-controls/story-controls.component';
import { VotingPanelComponent } from './voting-panel/voting-panel.component';
import { ResultsChartComponent } from './results-chart/results-chart.component';
import { ParticipantsListComponent } from './participants-list/participants-list.component';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
import { ToastNotificationService } from '../services/toast-notification.service';

@Component({
    selector: 'app-poker-session',
    templateUrl: './poker-session.component.html',
    styleUrls: ['./poker-session.component.scss'],
    imports: [
      CommonModule,
      MatCardModule,
      StoryControlsComponent,
      VotingPanelComponent,
      ResultsChartComponent,
      ParticipantsListComponent,
      ChatPanelComponent
    ]
})
export class PokerSessionComponent implements OnInit, OnDestroy {
  public id: string;
  public name: string;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionCoordinator = inject(SessionCoordinatorService);
  public stateService = inject(SessionStateService);
  private toastService = inject(ToastNotificationService);

  public ngOnInit() {
    try {
      this.id = this.route.snapshot.paramMap.get('id');
      this.name = sessionStorage.getItem('POKER_NAME') || localStorage.getItem('POKER_NAME');

      if (!this.id) {
        this.toastService.error('Invalid session ID');
        this.router.navigate(['/']);
        return;
      }

      if (!this.name) {
        return;
      }

      sessionStorage.setItem('POKER_NAME', this.name);
      this.sessionCoordinator.connect(this.id, this.name);
    } catch (error) {
      console.error('Failed to initialize poker session:', error);
      this.toastService.error('Failed to initialize session. Please try again.');
      this.router.navigate(['/']);
    }
  }

  public ngOnDestroy() {
    try {
      this.sessionCoordinator.disconnect();
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
}
