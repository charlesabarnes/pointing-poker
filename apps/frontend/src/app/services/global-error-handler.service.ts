import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ToastNotificationService } from './toast-notification.service';
import { environment } from '../../environments/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private injector = inject(Injector);

  handleError(error: Error | any): void {
    const toastService = this.injector.get(ToastNotificationService);

    if (!environment.production) {
      console.error('Global error caught:', error);
    }

    let userMessage = 'An unexpected error occurred. Please try again.';

    if (error?.message) {
      if (this.isNetworkError(error)) {
        userMessage = 'Network connection issue. Please check your internet connection.';
      } else if (this.isWebSocketError(error)) {
        userMessage = 'Connection to server lost. Attempting to reconnect...';
      } else if (this.isChunkLoadError(error)) {
        userMessage = 'Failed to load application. Please refresh the page.';
      } else if (!environment.production) {
        userMessage = error.message;
      }
    }

    toastService.error(userMessage);

    if (environment.production) {
      this.logErrorToService(error);
    }
  }


  private isNetworkError(error: any): boolean {
    return (
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('fetch') ||
      error?.message?.toLowerCase().includes('http') ||
      error?.status === 0
    );
  }


  private isWebSocketError(error: any): boolean {
    return (
      error?.message?.toLowerCase().includes('websocket') ||
      error?.message?.toLowerCase().includes('ws') ||
      error?.type === 'error' && error?.target instanceof WebSocket
    );
  }


  private isChunkLoadError(error: any): boolean {
    return (
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk')
    );
  }


  private logErrorToService(error: any): void {

    console.error('Error logged to service:', error);
  }
}
