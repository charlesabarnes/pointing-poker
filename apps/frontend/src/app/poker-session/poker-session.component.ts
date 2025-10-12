import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PokerWebSocketService } from '../services/poker-websocket.service';
import { PokerSessionStateService } from '../services/poker-session-state.service';
import { StoryControlsComponent } from './story-controls/story-controls.component';
import { VotingPanelComponent } from './voting-panel/voting-panel.component';
import { ResultsChartComponent } from './results-chart/results-chart.component';
import { ParticipantsListComponent } from './participants-list/participants-list.component';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';

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
    private wsService: PokerWebSocketService,
    public stateService: PokerSessionStateService
  ) {
    // Effect to reset selected value when current user's points are cleared
    effect(() => {
      const points = this.wsService.pointValues();
      const currentUserFingerprint = this.wsService.getCurrentUserFingerprint();
      if (currentUserFingerprint && points[currentUserFingerprint] === undefined) {
        this.stateService.resetSelectedValue();
        if (!this.stateService.showChart()) {
          this.stateService.resetConfetti();
        }
      }
    });
  }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    if (this.name) {
      // Connect to WebSocket
      this.wsService.connect(this.id, this.name);
    }
  }

  public ngOnDestroy() {
    // Disconnect from WebSocket
    this.wsService.disconnect();
  }

  public onClearVotes(): void {
    this.stateService.clearVotes();
  }

  public onShowVotes(): void {
    this.stateService.forceShowValues();
  }
}
