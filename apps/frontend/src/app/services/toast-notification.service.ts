import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

@Injectable({
  providedIn: 'root'
})
export class ToastNotificationService {
  private readonly defaultDuration = 4000;
  private readonly errorDuration = 6000;
  private readonly successDuration = 3000;

  private snackBar = inject(MatSnackBar);

  /**
   * Show a success toast notification
   */
  public success(message: string, action: string = 'Close'): void {
    this.show(message, ToastType.SUCCESS, action, this.successDuration);
  }

  /**
   * Show an error toast notification
   */
  public error(message: string, action: string = 'Close'): void {
    this.show(message, ToastType.ERROR, action, this.errorDuration);
  }

  /**
   * Show a warning toast notification
   */
  public warning(message: string, action: string = 'Close'): void {
    this.show(message, ToastType.WARNING, action, this.defaultDuration);
  }

  /**
   * Show an info toast notification
   */
  public info(message: string, action: string = 'Close'): void {
    this.show(message, ToastType.INFO, action, this.defaultDuration);
  }

  /**
   * Show a custom toast notification
   */
  private show(message: string, type: ToastType, action: string, duration: number): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [`toast-${type}`]
    };

    this.snackBar.open(message, action, config);
  }

  /**
   * Dismiss all currently displayed toasts
   */
  public dismissAll(): void {
    this.snackBar.dismiss();
  }
}
