import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCircle, faSpinner } from '@fortawesome/pro-solid-svg-icons';
import { WebSocketConnectionService, ConnectionState } from '../../services/websocket-connection.service';

@Component({
  selector: 'app-connection-status',
  imports: [CommonModule, MatTooltipModule, FontAwesomeModule],
  templateUrl: './connection-status.component.html',
  styleUrl: './connection-status.component.scss'
})
export class ConnectionStatusComponent {
  faCircle = faCircle;
  faSpinner = faSpinner;

  private wsConnection = inject(WebSocketConnectionService);

  connectionState = computed(() => this.wsConnection.connectionState());

  statusText = computed(() => {
    switch (this.connectionState()) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.ERROR:
        return 'Connection Error';
      case ConnectionState.DISCONNECTED:
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  });

  tooltipText = computed(() => {
    switch (this.connectionState()) {
      case ConnectionState.CONNECTED:
        return 'Connected to server';
      case ConnectionState.CONNECTING:
        return 'Establishing connection...';
      case ConnectionState.RECONNECTING:
        return 'Connection lost. Attempting to reconnect...';
      case ConnectionState.ERROR:
        return 'Failed to connect to server. Check your connection.';
      case ConnectionState.DISCONNECTED:
        return 'Not connected to server';
      default:
        return '';
    }
  });

  statusClass = computed(() => {
    switch (this.connectionState()) {
      case ConnectionState.CONNECTED:
        return 'status-connected';
      case ConnectionState.CONNECTING:
        return 'status-connecting';
      case ConnectionState.RECONNECTING:
        return 'status-reconnecting';
      case ConnectionState.ERROR:
        return 'status-error';
      case ConnectionState.DISCONNECTED:
        return 'status-disconnected';
      default:
        return '';
    }
  });
}
