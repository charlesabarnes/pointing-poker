import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUser,
  faUserPlus,
  faUserCircle,
  faCheckCircle,
  faCircle,
  faQuestionCircle
} from '@fortawesome/pro-solid-svg-icons';
import { PokerWebSocketService } from '../../services/poker-websocket.service';
import { PokerSessionStateService } from '../../services/poker-session-state.service';

@Component({
  selector: 'app-participants-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    FontAwesomeModule
  ],
  templateUrl: './participants-list.component.html',
  styleUrls: ['./participants-list.component.scss']
})
export class ParticipantsListComponent {
  // Icons
  faUser = faUser;
  faUserPlus = faUserPlus;
  faUserCircle = faUserCircle;
  faCheckCircle = faCheckCircle;
  faCircle = faCircle;
  faQuestionCircle = faQuestionCircle;

  // Input
  @Input() currentUserName: string;

  constructor(
    public wsService: PokerWebSocketService,
    public stateService: PokerSessionStateService
  ) {}
}
