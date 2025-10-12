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
  private pendingSessionId: string | null = null;

  constructor(
    public dialog: MatDialog,
    public router: Router,
    public snackBar: MatSnackBar
    ) {
  }

  public ngOnInit(): void {
    // Try sessionStorage first, fall back to localStorage for persistence
    this.name = sessionStorage.getItem(POKER_NAME) || localStorage.getItem(POKER_NAME);
    if (this.name) {
      // Ensure both storages are in sync
      sessionStorage.setItem(POKER_NAME, this.name);
    } else {
      // Check if trying to navigate to a session without a name
      const currentUrl = this.router.url;
      const sessionMatch = currentUrl.match(/\/session\/([^\/\?]+)/);

      if (sessionMatch) {
        // Store the intended session ID but stay on the session page
        this.pendingSessionId = sessionMatch[1];
      }

      // Prompt for name
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
      this.name = name;
      sessionStorage.setItem(POKER_NAME, name);
      localStorage.setItem(POKER_NAME, name); // Persist across sessions

      // Check if we have a pending session ID from initial navigation
      if (this.pendingSessionId) {
        const sessionId = this.pendingSessionId;
        this.pendingSessionId = null; // Clear it
        setTimeout(() => { this.router.navigate([`/session/${sessionId}`]); }, 500);
      } else if (this.router.url === '/') {
        // Create a new session
        setTimeout(() => { this.router.navigate([`/session/${this.generateSessionId(30)}`]); }, 500);
      } else {
        // Stay on current session URL and let the component load
        // Extract the current URL and navigate to it to trigger component initialization
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigateByUrl(currentUrl);
        });
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
