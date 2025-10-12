import { Component, Input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFlag, faEye } from '@fortawesome/pro-solid-svg-icons';
import { PointOption } from 'shared';
import { PokerSessionStateService } from '../../services/poker-session-state.service';

@Component({
  selector: 'app-voting-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    FontAwesomeModule
  ],
  templateUrl: './voting-panel.component.html',
  styleUrls: ['./voting-panel.component.scss']
})
export class VotingPanelComponent {
  // Icons
  faFlag = faFlag;
  faEye = faEye;

  // Point options
  public options: PointOption[] = [
    { label: '.5', value: .5 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '5', value: 5 },
    { label: '8', value: 8 },
    { label: '13', value: 13 },
    { label: '21', value: 21 },
    { label: '0', value: 0, disabled: true },
  ];

  constructor(public stateService: PokerSessionStateService) {}

  public onPointValueChange(value: number): void {
    this.stateService.selectPointValue(value);
  }

  public onSpectatorToggle(value: boolean): void {
    this.stateService.setSpectatorMode(value);
  }
}
