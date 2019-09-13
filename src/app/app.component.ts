import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { NovoModalService } from 'novo-elements';
import { CreateSessionComponent } from './create-session/create-session.component';
const POKER_NAME = 'POKER_NAME';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(public modalService: NovoModalService, public ref: ViewContainerRef) {
    this.modalService.parentViewContainer = ref;
  }
  public name: string;

  public ngOnInit(): void {
    this.name = sessionStorage.getItem(POKER_NAME);
    if (!this.name) {
      this.modalService.open(CreateSessionComponent);
    }
  }
}
