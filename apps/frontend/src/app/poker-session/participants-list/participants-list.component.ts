import { Component, input, inject } from '@angular/core';
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
import { SessionStateService } from '../../services/session-state.service';

@Component({
  selector: 'app-participants-list',
  imports: [
    CommonModule,
    MatCardModule,
    FontAwesomeModule
  ],
  templateUrl: './participants-list.component.html',
  styleUrls: ['./participants-list.component.scss']
})
export class ParticipantsListComponent {
  faUser = faUser;
  faUserPlus = faUserPlus;
  faUserCircle = faUserCircle;
  faCheckCircle = faCheckCircle;
  faCircle = faCircle;
  faQuestionCircle = faQuestionCircle;

  currentUserName = input<string>();

  public stateService = inject(SessionStateService);
}
