import { Component, OnInit, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CreateSessionComponent } from './create-session/create-session.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCopy, faCog } from '@fortawesome/pro-solid-svg-icons';
import { ConnectionStatusComponent } from './shared/connection-status/connection-status.component';
import { filter } from 'rxjs';

const POKER_NAME = 'POKER_NAME';
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
      MatToolbarModule,
      FontAwesomeModule,
      MatButtonModule,
      MatTooltipModule,
      RouterOutlet,
      ClipboardModule,
      ConnectionStatusComponent
    ]
})
export class AppComponent implements OnInit {
  // FontAwesome icons
  faCopy = faCopy;
  faCog = faCog;

  public name: string;
  public showConnectionStatus = false;

  constructor(
    public dialog: MatDialog,
    public router: Router,
    public snackBar: MatSnackBar
    ) {
  }

  public ngOnInit(): void {
    this.name = sessionStorage.getItem(POKER_NAME);
    if (!this.name) {
      this.changeName();
    }

    // Show connection status only on session pages
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showConnectionStatus = event.url.includes('/session/');
      });

    // Check initial route
    this.showConnectionStatus = this.router.url.includes('/session/');
  }

  public copiedToClipboard(): void {
    this.snackBar.open('Copied URL to clipboard', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
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
    const dialogRef = this.dialog.open(CreateSessionComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      this.startSession(result);
    });
  }

  private generateSessionId(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CHAR_SET.charAt(Math.floor(Math.random() * CHAR_SET.length));
    }
    return result;
  }

}
