import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ToastNotificationService } from './toast-notification.service';
import { environment } from '../../environments/environment';

/**
 * Global error handler that catches all unhandled errors
 * and displays user-friendly messages
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private injector = inject(Injector);

  handleError(error: Error | any): void {
    // Get the toast service (using injector to avoid circular dependency)
    const toastService = this.injector.get(ToastNotificationService);

    // Log to console in development
    if (!environment.production) {
      console.error('Global error caught:', error);
    }

    // Determine error message based on error type
    let userMessage = 'An unexpected error occurred. Please try again.';

    if (error?.message) {
      // Check for common error patterns
      if (this.isNetworkError(error)) {
        userMessage = 'Network connection issue. Please check your internet connection.';
      } else if (this.isWebSocketError(error)) {
        userMessage = 'Connection to server lost. Attempting to reconnect...';
      } else if (this.isChunkLoadError(error)) {
        userMessage = 'Failed to load application. Please refresh the page.';
      } else if (!environment.production) {
        // In development, show more detailed error messages
        userMessage = error.message;
      }
    }

    // Show error toast
    toastService.error(userMessage);

    // In production, you might want to send errors to a logging service
    if (environment.production) {
      this.logErrorToService(error);
    }
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    return (
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('fetch') ||
      error?.message?.toLowerCase().includes('http') ||
      error?.status === 0
    );
  }

  /**
   * Check if error is WebSocket-related
   */
  private isWebSocketError(error: any): boolean {
    return (
      error?.message?.toLowerCase().includes('websocket') ||
      error?.message?.toLowerCase().includes('ws') ||
      error?.type === 'error' && error?.target instanceof WebSocket
    );
  }

  /**
   * Check if error is chunk loading error (lazy loading failure)
   */
  private isChunkLoadError(error: any): boolean {
    return (
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk')
    );
  }

  /**
   * Log error to external service (placeholder for future implementation)
   */
  private logErrorToService(error: any): void {
    // TODO: Implement error logging service integration
    // Examples: Sentry, LogRocket, Application Insights, etc.
    console.error('Error logged to service:', error);
  }
}
