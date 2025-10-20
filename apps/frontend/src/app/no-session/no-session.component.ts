import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faPlus } from '@fortawesome/pro-solid-svg-icons';

const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Component({
    selector: 'app-no-session',
    templateUrl: './no-session.component.html',
    styleUrls: ['./no-session.component.scss'],
    imports: [MatButtonModule, MatCardModule, FontAwesomeModule]
})
export class NoSessionComponent {
  faCheck = faCheck;
  faPlus = faPlus;

  private router = inject(Router);

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
