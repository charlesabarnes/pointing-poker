import { Injectable, OnDestroy, inject } from '@angular/core';
import { UserActivityService } from './user-activity.service';
import { UserActivity } from 'shared';

export type UserStatus = 'online' | 'afk' | 'offline';

@Injectable({
  providedIn: 'root'
})
export class UserPresenceService implements OnDestroy {
  private heartbeatWorker: Worker | null = null;
  private statusCheckInterval: any;
  private fallbackInterval: any;
  private currentStatus: UserStatus = 'online';
  private activitySubscription: any;

  private readonly HEARTBEAT_INTERVAL = 15000;
  private readonly STATUS_CHECK_INTERVAL = 10000;
  private readonly OFFLINE_THRESHOLD = 3600000;

  private activityService = inject(UserActivityService);

  startHeartbeat(sendHeartbeatFn: () => void): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, using fallback setInterval');
      this.fallbackInterval = setInterval(() => sendHeartbeatFn(), this.HEARTBEAT_INTERVAL);
      return;
    }

    try {
      this.heartbeatWorker = new Worker(
        new URL('../workers/heartbeat.worker', import.meta.url),
        { type: 'module' }
      );

      this.heartbeatWorker.onmessage = (event: MessageEvent) => {
        const { type } = event.data;

        if (type === 'heartbeat') {
          sendHeartbeatFn();
        }
      };

      this.heartbeatWorker.onerror = (error) => {
        console.error('Heartbeat worker error:', error);
        this.stopHeartbeat();
        this.fallbackInterval = setInterval(() => sendHeartbeatFn(), this.HEARTBEAT_INTERVAL);
      };

      this.heartbeatWorker.postMessage({
        type: 'start',
        data: { interval: this.HEARTBEAT_INTERVAL }
      });
    } catch (error) {
      console.error('Failed to create heartbeat worker:', error);
      this.fallbackInterval = setInterval(() => sendHeartbeatFn(), this.HEARTBEAT_INTERVAL);
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatWorker) {
      this.heartbeatWorker.postMessage({ type: 'stop' });
      this.heartbeatWorker.terminate();
      this.heartbeatWorker = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  startStatusMonitoring(onStatusChange: (status: UserStatus) => void): void {
    this.statusCheckInterval = setInterval(() => {
      const userStatus = this.activityService.getUserStatus();

      if (userStatus !== this.currentStatus) {
        this.currentStatus = userStatus;
        onStatusChange(userStatus);
      }
    }, this.STATUS_CHECK_INTERVAL);

    this.activitySubscription = this.activityService.activity$.subscribe(() => {
      const userStatus = this.activityService.getUserStatus();

      if (userStatus !== this.currentStatus) {
        this.currentStatus = userStatus;
        onStatusChange(userStatus);
      }
    });
  }

  stopStatusMonitoring(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = null;
    }
  }

  checkOtherUsersActivity(
    userActivity: Record<string, UserActivity>,
    currentUserFingerprint: string
  ): Record<string, UserActivity> {
    const currentTime = Date.now();
    const updatedActivity = { ...userActivity };
    let hasChanges = false;

    Object.keys(updatedActivity).forEach(fingerprint => {
      if (fingerprint === currentUserFingerprint) return;

      const lastActive = updatedActivity[fingerprint].lastActive;
      const timeSinceActive = currentTime - lastActive;

      if (timeSinceActive > this.OFFLINE_THRESHOLD) {
        if (updatedActivity[fingerprint].status !== 'offline') {
          updatedActivity[fingerprint] = {
            ...updatedActivity[fingerprint],
            status: 'offline'
          };
          hasChanges = true;
        }
      }
    });

    return hasChanges ? updatedActivity : userActivity;
  }

  getCurrentStatus(): UserStatus {
    return this.currentStatus;
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.stopStatusMonitoring();
  }
}
