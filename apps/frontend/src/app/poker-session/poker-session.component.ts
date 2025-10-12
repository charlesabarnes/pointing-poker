import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PokerWebSocketService } from '../services/poker-websocket.service';
import { PokerSessionStateService } from '../services/poker-session-state.service';
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
    standalone: true,
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
  // Session data
  public id: string;
  public name: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wsService: PokerWebSocketService,
    public stateService: PokerSessionStateService,
    private toastService: ToastNotificationService
  ) {
    // Effect to sync selected value when current user's points change
    effect(() => {
      const points = this.wsService.pointValues();
      const currentUserFingerprint = this.wsService.getCurrentUserFingerprint();

      if (currentUserFingerprint) {
        const currentUserPoints = points[currentUserFingerprint];

        if (currentUserPoints === undefined) {
          // Vote was cleared, reset selection
          this.stateService.resetSelectedValue();
          if (!this.stateService.showChart()) {
            this.stateService.resetConfetti();
          }
        } else if (
          typeof currentUserPoints === 'number' &&
          this.stateService.selectedPointValue() !== currentUserPoints
        ) {
          // Vote was restored or updated from server, sync local state
          this.stateService.selectedPointValue.set(currentUserPoints);
        }
      }
    });
  }

  public ngOnInit() {
    try {
      this.id = this.route.snapshot.paramMap.get('id');
      // Try sessionStorage first, fall back to localStorage
      this.name = sessionStorage.getItem('POKER_NAME') || localStorage.getItem('POKER_NAME');

      // Validate session parameters
      if (!this.id) {
        this.toastService.error('Invalid session ID');
        this.router.navigate(['/']);
        return;
      }

      if (!this.name) {
        this.toastService.warning('Please set your name to join the session');
        this.router.navigate(['/']);
        return;
      }

      // Ensure both storages are in sync
      sessionStorage.setItem('POKER_NAME', this.name);

      // Connect to WebSocket
      this.wsService.connect(this.id, this.name);
    } catch (error) {
      console.error('Failed to initialize poker session:', error);
      this.toastService.error('Failed to initialize session. Please try again.');
      this.router.navigate(['/']);
    }
  }

  public ngOnDestroy() {
    try {
      // Disconnect from WebSocket
      this.wsService.disconnect();
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  public onClearVotes(): void {
    try {
      this.stateService.clearVotes();
    } catch (error) {
      console.error('Failed to clear votes:', error);
      this.toastService.error('Failed to clear votes. Please try again.');
    }
  }

  public onShowVotes(): void {
    try {
      this.stateService.forceShowValues();
    } catch (error) {
      console.error('Failed to show votes:', error);
      this.toastService.error('Failed to show votes. Please try again.');
    }
  }
}
