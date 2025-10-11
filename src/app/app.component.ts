import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreateSessionComponent } from './create-session/create-session.component';
import { Router } from '@angular/router';
const POKER_NAME = 'POKER_NAME';
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit {
  constructor(
    public dialog: MatDialog,
    public router: Router,
    public snackBar: MatSnackBar
    ) {
  }
  public name: string;

  public ngOnInit(): void {
    this.name = sessionStorage.getItem(POKER_NAME);
    if (!this.name) {
      this.changeName();
    }
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
      result += CHAR_SET.charAt(Math.floor(Math.random() * length));
    }
    return result;
  }

}
