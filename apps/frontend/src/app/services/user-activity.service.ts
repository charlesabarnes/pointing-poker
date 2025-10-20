import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';

/**
 * Tracks user activity (mouse, keyboard, focus) to determine AFK status
 */
@Injectable({
  providedIn: 'root'
})
export class UserActivityService implements OnDestroy {
  private _lastActivityTime: number = Date.now();
  private _isActive: boolean = true;
  private activitySubject = new Subject<number>();
  private activityListeners: (() => void)[] = [];

  public activity$: Observable<number> = this.activitySubject.asObservable();

  private readonly AFK_THRESHOLD = 120000; 

  constructor() {
    this.setupActivityListeners();
  }

  private setupActivityListeners(): void {
    if (typeof window === 'undefined') return;

    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Create observables for all activity events
    const eventStreams = activityEvents.map(eventType =>
      fromEvent(document, eventType)
    );

    // Merge all events and debounce to avoid excessive updates
    const mergedActivity$ = merge(...eventStreams).pipe(
      debounceTime(1000), // Only emit once per second at most
      map(() => Date.now())
    );

    // Subscribe to activity events
    const subscription = mergedActivity$.subscribe(timestamp => {
      this._lastActivityTime = timestamp;
      this._isActive = true;
      this.activitySubject.next(timestamp);
    });

    // Store cleanup function
    this.activityListeners.push(() => subscription.unsubscribe());

    // Listen for visibility changes
    const visibilityListener = () => {
      if (!document.hidden) {
        this._lastActivityTime = Date.now();
        this._isActive = true;
        this.activitySubject.next(Date.now());
      }
    };

    document.addEventListener('visibilitychange', visibilityListener);
    this.activityListeners.push(() =>
      document.removeEventListener('visibilitychange', visibilityListener)
    );

    // Listen for beforeunload (tab closing)
    const beforeUnloadListener = () => {
      this.activitySubject.next(-1); // Special value to indicate user is leaving
    };

    window.addEventListener('beforeunload', beforeUnloadListener);
    this.activityListeners.push(() =>
      window.removeEventListener('beforeunload', beforeUnloadListener)
    );
  }


  public getLastActivityTime(): number {
    return this._lastActivityTime;
  }

  public isActive(): boolean {
    const timeSinceActivity = Date.now() - this._lastActivityTime;
    return timeSinceActivity < this.AFK_THRESHOLD;
  }

  public getTimeSinceActivity(): number {
    return Date.now() - this._lastActivityTime;
  }


  public getUserStatus(): 'online' | 'afk' {
    return this.isActive() ? 'online' : 'afk';
  }

  public isPageVisible(): boolean {
    return typeof document !== 'undefined' && !document.hidden;
  }


  public markActive(): void {
    this._lastActivityTime = Date.now();
    this._isActive = true;
    this.activitySubject.next(Date.now());
  }

  ngOnDestroy(): void {
    // Clean up all  listeners
    this.activityListeners.forEach(cleanup => cleanup());
    this.activityListeners = [];
    this.activitySubject.complete();
  }
}
