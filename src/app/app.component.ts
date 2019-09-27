import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { NovoModalService, NovoToastService } from 'novo-elements';
import { CreateSessionComponent } from './create-session/create-session.component';
import { Router } from '@angular/router';
const POKER_NAME = 'POKER_NAME';
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    public modalService: NovoModalService,
    public ref: ViewContainerRef,
    public router: Router,
    public toastService: NovoToastService
    ) {
    this.modalService.parentViewContainer = ref;
    this.toastService.parentViewContainer = ref;
  }
  public name: string;

  public ngOnInit(): void {
    this.name = sessionStorage.getItem(POKER_NAME);
    if (!this.name) {
      this.changeName();
    }
  }

  public copiedToClipboard(): void {
    this.toastService.alert({
      title: 'Url Copied',
      message: 'Copied Url to clipboard',
      icon: 'clipboard',
      theme: 'success',
      position: 'fixedTop',
    });
  }

  get currentUrl(): string {
    return window.location.href;
  }

  private startSession(name: string): void {
    if (name) {
      sessionStorage.setItem(POKER_NAME, name);
      if (this.router.url === '/') {
        setTimeout( () => { this.router.navigate([`/session/${this.generateSessionId(30)}`]); }, 500);
      } else {
        location.reload();
      }
    }
  }

  public changeName() {
    this.modalService.open(CreateSessionComponent).onClosed.then(this.startSession.bind(this));
  }

  private generateSessionId(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CHAR_SET.charAt(Math.floor(Math.random() * length));
    }
    return result;
  }

}
