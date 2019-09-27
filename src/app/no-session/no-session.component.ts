import { Component } from '@angular/core';
import { Router } from '@angular/router';
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Component({
  selector: 'app-no-session',
  templateUrl: './no-session.component.html',
  styleUrls: ['./no-session.component.scss']
})
export class NoSessionComponent {

  constructor(public router: Router) { }

  public createSession(): void {
    setTimeout( () => { this.router.navigate([`/session/${this.generateSessionId(30)}`]); }, 500);
  }

  private generateSessionId(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CHAR_SET.charAt(Math.floor(Math.random() * length));
    }
    return result;
  }

}
