import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { NovoFormGroup, TextBoxControl, FormUtils, FieldInteractionApi } from 'novo-elements';
import { ChartOptions, ChartType, ChartData } from 'chart.js';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';
import confetti, { create } from 'canvas-confetti';

export class Message {
  constructor(
    public sender: string,
    public content: string | number,
    public session: string,
    public type: 'chat' | 'points' | 'action' | 'disconnect' | 'description' | 'heartbeat' | 'join',
    public timestamp?: number
  ) {
    this.timestamp = this.timestamp || Date.now();
  }
}

// TODO: clean confetti logic
const createConfettiCanvas = create(undefined, { useWorker: true, resize: true });

@Component({
  selector: 'app-poker-session',
  templateUrl: './poker-session.component.html',
  styleUrls: ['./poker-session.component.scss']
})
export class PokerSessionComponent implements OnInit, AfterViewChecked {
  public id: string;
  public name: string;
  public _webSocket: WebSocketSubject<any>; // tslint:disable-line
  public pointValues: any = {};
  public selectedPointValue: any;
  public lastDescription = '';
  public chatLog: Message[] = [];
  public form: NovoFormGroup;
  public chatForm: NovoFormGroup;
  public nameControl: TextBoxControl;
  public messageControl: TextBoxControl;
  public _showValues: boolean = false; // tslint:disable-line
  public _spectator: boolean = false; // tslint:disable-line
  public userActivity: {[key: string]: {lastActive: number, status: 'online' | 'away' | 'offline'}} = {};
  public activityInterval: any;
  public heartbeatInterval: any;
  public newUserJoined: boolean = false;
  public recentJoinedUser: string = '';
  public OFFLINE_THRESHOLD = 60000; // 1 minute with no activity = offline
  public AWAY_THRESHOLD = 30000; // 30 seconds with no activity = away
  public reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  
  // Cached chart data to prevent re-renders
  private _cachedChartData: number[] = [];
  private _cachedChartLabels: string[] = [];
  private _lastPointValuesString: string = '';
  public cachedChartConfig: any = null;
  public options: any[] = [
    {
      label: '.5',
      value: .5,
    },
    {
      label: '1',
      value: 1,
    },
    {
      label: '2',
      value: 2,
    },
    {
      label: '3',
      value: 3,
    },
    {
      label: '5',
      value: 5,
    },
    {
      label: '8',
      value: 8,
    },
    {
      label: '13',
      value: 13,
    },
    {
      label: '21',
      value: 21,
    },
    {
      label: '0',
      value: 0,
      disabled: true
    },
  ];
  @ViewChild('scroller', { static: false }) private scroller: ElementRef;
  public pieChartPlugins = [pluginDataLabels];

  public pointDistributionChartType: ChartType = 'pie';
  // Colors are now defined directly in the template
  private confettiShot: boolean = false;
  
  public pointDistributionChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#2C3E50',
          font: {
            size: 16
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: {
          size: 20,
          weight: 'bold'
        },
        formatter: (value, ctx) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label;
        },
        textStrokeColor: '#2C3E50',
        textStrokeWidth: 2,
      },
    }
  };

  constructor(private route: ActivatedRoute, public formUtils: FormUtils) { }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    if (this.name) {
      this.initializeWebSocket();
      this.createForm();
      this.createChatForm();
      this.setupHeartbeat();
      this.setupActivityMonitor();
      this.setupFocusListener();

      // Announce this user has joined
      setTimeout(() => {
        this.send('has joined the session', 'join');
      }, 1000);
    }
  }

  private initializeWebSocket() {
    console.group('🔌 WebSocket Initialization');
    console.log('Time:', new Date().toLocaleTimeString());
    console.log('Session ID:', this.id);
    console.log('User:', this.name);
    
    this.webSocket.subscribe({
      next: this.handleSocketUpdates.bind(this),
      error: (error) => {
        console.group('❌ WebSocket Error');
        console.error('Error details:', error);
        console.groupEnd();
        this.handleDisconnection();
      },
      complete: () => {
        console.group('🔚 WebSocket Closed');
        console.log('Connection closed by server or network');
        console.groupEnd();
        this.handleDisconnection();
      }
    });
    
    console.log('WebSocket subscribed successfully');
    console.groupEnd();
  }

  private handleDisconnection() {
    console.group('🔌 Handle Disconnection');
    console.log('Time:', new Date().toLocaleTimeString());
    
    // Clear the existing websocket
    this._webSocket = undefined;
    console.log('WebSocket cleared');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat interval cleared');
    }
    
    console.groupEnd();
    
    // Attempt reconnection
    this.attemptReconnection();
  }

  private attemptReconnection() {
    console.group('🔄 Reconnection Attempt');
    console.log('Time:', new Date().toLocaleTimeString());
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      console.log('Total attempts:', this.reconnectAttempts);
      console.groupEnd();
      
      // Add a visual indicator for the user
      this.chatLog.push(new Message(
        'System',
        'Connection lost. Please refresh the page.',
        this.id,
        'chat'
      ));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log('Attempt:', `${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    console.log('Delay:', `${delay}ms`);
    console.log('Next attempt at:', new Date(Date.now() + delay).toLocaleTimeString());
    console.groupEnd();
    
    setTimeout(() => {
      console.group('🔄 Executing Reconnection');
      console.log('Time:', new Date().toLocaleTimeString());
      console.log('Attempt number:', this.reconnectAttempts);
      
      if (!this._webSocket || this._webSocket.closed) {
        console.log('WebSocket is closed, initializing new connection...');
        this.initializeWebSocket();
        
        // Reinitialize after successful connection
        this.setupHeartbeat();
        
        // Re-announce user presence
        setTimeout(() => {
          console.log('📢 Announcing reconnection to session');
          this.send('has reconnected to the session', 'join');
          // Resend current vote if any
          if (this.selectedPointValue !== undefined && this.selectedPointValue !== 0) {
            console.log('📊 Resending vote:', this.selectedPointValue);
            this.send(this.selectedPointValue);
          }
        }, 500);
        
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        console.log('✅ Reconnection successful, attempts reset');
      } else {
        console.log('WebSocket already connected, skipping reconnection');
      }
      
      console.groupEnd();
    }, delay);
  }

  private setupFocusListener() {
    // Listen for window focus events
    window.addEventListener('focus', () => {
      console.group('👁️ Window Focus Event');
      console.log('Time:', new Date().toLocaleTimeString());
      
      // Check if websocket is closed or undefined
      if (!this._webSocket || this._webSocket.closed) {
        console.log('Status: Connection lost, initiating reconnection');
        console.log('WebSocket state:', this._webSocket ? 'exists but closed' : 'undefined');
        this.reconnectAttempts = 0; // Reset attempts on manual reconnection
        console.groupEnd();
        this.attemptReconnection();
      } else {
        console.log('Status: Connection active, no action needed');
        console.groupEnd();
      }
    });
  }

  private setupHeartbeat() {
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send heartbeat every 8 seconds (server checks every 10 seconds)
    this.heartbeatInterval = setInterval(() => {
      console.group('🫀 Heartbeat Check');
      console.log('Time:', new Date().toLocaleTimeString());
      
      if (this._webSocket && !this._webSocket.closed) {
        console.log('Status: Connection alive, sending heartbeat');
        this.send('', 'heartbeat');
        
        // Also update our own activity status
        if (!this.userActivity[this.name]) {
          this.userActivity = {
            ...this.userActivity,
            [this.name]: {
              lastActive: Date.now(),
              status: 'online'
            }
          };
        } else if (this.userActivity[this.name].status !== 'online') {
          // Only update if status is changing
          this.userActivity = {
            ...this.userActivity,
            [this.name]: {
              lastActive: Date.now(),
              status: 'online'
            }
          };
        } else {
          // Just update timestamp without triggering change detection
          this.userActivity[this.name].lastActive = Date.now();
        }
      } else {
        // WebSocket is closed, trigger reconnection
        console.log('Status: Connection lost!');
        console.log('WebSocket state:', this._webSocket ? 'exists but closed' : 'undefined');
        this.handleDisconnection();
      }
      
      console.groupEnd();
    }, 8000);
  }

  private setupActivityMonitor() {
    // Check user activity status every 10 seconds
    this.activityInterval = setInterval(() => {
      const currentTime = Date.now();
      let hasChanges = false;
      const newUserActivity = { ...this.userActivity };

      Object.keys(newUserActivity).forEach(user => {
        const userInfo = newUserActivity[user];
        const timeSinceActive = currentTime - userInfo.lastActive;
        let newStatus = userInfo.status;

        if (timeSinceActive > this.OFFLINE_THRESHOLD) {
          newStatus = 'offline';
        } else if (timeSinceActive > this.AWAY_THRESHOLD) {
          newStatus = 'away';
        } else {
          newStatus = 'online';
        }

        // Only update if status changed
        if (newStatus !== userInfo.status) {
          hasChanges = true;
          newUserActivity[user] = {
            ...userInfo,
            status: newStatus
          };
        }
      });

      // Only update the object reference if there were actual changes
      if (hasChanges) {
        this.userActivity = newUserActivity;
      }
    }, 10000);
  }

  public ngAfterViewChecked() {
    this.scrollToBottom();
    // document.querySelector('.chat .novo-form').setAttribute('autocomplete', 'off');
  }

  public ngOnDestroy() {
    // Clear intervals when component is destroyed
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }
    // Close websocket connection
    if (this._webSocket) {
      this._webSocket.complete();
    }
    // Remove focus listener
    window.removeEventListener('focus', this.setupFocusListener);
  }

  get webSocket(): WebSocketSubject<any> {
    if (typeof this._webSocket === 'undefined') {
      const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host.replace('4200', '4000')}/?session=${this.id}`;
      
      console.group('🌐 Creating WebSocket');
      console.log('URL:', wsUrl);
      console.log('Session:', this.id);
      console.log('User:', this.name);
      console.groupEnd();
      
      this._webSocket = webSocket(wsUrl);
      this._webSocket.next(new Message(this.name, undefined, this.id, 'points'));
    }
    return this._webSocket;
  }

  get userNames(): string[] {
    return Object.keys(this.pointValues);
  }

  get showValues(): boolean {
    return Object.keys(this.pointValues).filter((name: any) => {
      return !this.pointValues[name];
    }).length === 0 || this._showValues;
  }

  set showValues(value: boolean) {
    this._showValues = value;
  }

  public doShowValues(): void {
    this.showValues = true;
  }

  public clearVotes(): void {
    this.showValues = false;
    this.send('ClearVotes');
    this.send('', 'description');
    // Reset chart cache
    this._lastPointValuesString = '';
    this.cachedChartConfig = null;
  }

  get spectator(): boolean {
    return this._spectator;
  }

  set spectator(value: boolean) {
    this._spectator = value;
    this.send(value ? 'spectate' : 0);
  }

  get pointDistributionChartData(): number[] {
    // Only recalculate if pointValues actually changed
    const currentPointValuesString = this.getPointValuesString();
    if (currentPointValuesString !== this._lastPointValuesString) {
      this._lastPointValuesString = currentPointValuesString;
      const pointValueCounts = this.getPointValueCountObject();
      this._cachedChartData = [];
      
      for (const pointValue in pointValueCounts) {
        if (pointValueCounts.hasOwnProperty(pointValue)) {
          this._cachedChartData.push(pointValueCounts[pointValue]);
        }
      }
      
      if (Object.keys(pointValueCounts).length == 1 && !this.confettiShot) {
        createConfettiCanvas({
          shapes: ['square'],
          particleCount: 100,
          spread: 70,
          angle: 42,
        });
        this.confettiShot = true;
      }
    }
    
    return this._cachedChartData;
  }

  get pointDistributionChartLabels(): string[] {
    // Only recalculate if pointValues actually changed (reuse the check from chartData)
    const currentPointValuesString = this.getPointValuesString();
    if (currentPointValuesString !== this._lastPointValuesString) {
      const pointValueCounts = this.getPointValueCountObject();
      this._cachedChartLabels = [];
      
      for (const pointValue in pointValueCounts) {
        if (pointValueCounts.hasOwnProperty(pointValue)) {
          this._cachedChartLabels.push(pointValue);
        }
      }
    }
    
    return this._cachedChartLabels;
  }

  private getPointValuesString(): string {
    // Create a string representation of point values for comparison
    // Only include actual votes, not undefined values
    const relevantValues = {};
    for (const user in this.pointValues) {
      if (this.pointValues.hasOwnProperty(user) && 
          this.pointValues[user] !== 'disconnect' && 
          this.pointValues[user] !== undefined &&
          this.pointValues[user] !== null) {
        relevantValues[user] = this.pointValues[user];
      }
    }
    return JSON.stringify(relevantValues);
  }

  get showChart(): boolean {
    return this.showValues && Object.keys(this.pointValues).length > 0;
  }

  get chartConfig(): any {
    // Only recalculate if data actually changed
    const currentPointValuesString = this.getPointValuesString();
    if (currentPointValuesString !== this._lastPointValuesString || !this.cachedChartConfig) {
      console.log('📊 Chart data recalculating. Old:', this._lastPointValuesString, 'New:', currentPointValuesString);
      this.cachedChartConfig = {
        labels: this.pointDistributionChartLabels,
        datasets: [{
          data: this.pointDistributionChartData,
          backgroundColor: ['#4A89DC', '#8CC152', '#DA4453', '#F6B042', '#2F384F', '#282828', '#662255', '#454EA0']
        }]
      };
    }
    return this.cachedChartConfig;
  }

  private handleSocketUpdates(res: Message): void {
    if (res && res.sender !== 'NS') {
      // Log incoming messages (except heartbeats for noise reduction)
      if (res.type !== 'heartbeat') {
        console.group('📥 Received Message');
        console.log('Type:', res.type);
        console.log('Sender:', res.sender);
        console.log('Content:', res.content);
        console.log('Timestamp:', new Date(res.timestamp).toLocaleTimeString());
        console.groupEnd();
      } else {
        console.log(`💓 Received heartbeat from ${res.sender} at ${new Date().toLocaleTimeString()}`);
      }
      
      // Update user activity on any message received
      // Only create new object if user doesn't exist or status changes
      if (!this.userActivity[res.sender]) {
        this.userActivity = {
          ...this.userActivity,
          [res.sender]: {
            lastActive: res.timestamp || Date.now(),
            status: 'online'
          }
        };
      } else if (this.userActivity[res.sender].status !== 'online') {
        // Only update object reference if status is changing
        this.userActivity = {
          ...this.userActivity,
          [res.sender]: {
            lastActive: res.timestamp || Date.now(),
            status: 'online'
          }
        };
      } else {
        // Just update the timestamp without changing object reference
        this.userActivity[res.sender].lastActive = res.timestamp || Date.now();
      }

      switch (res.type) {
        case 'disconnect':
          // Remove from pointValues - create new object for change detection
          const newPointValues = { ...this.pointValues };
          delete newPointValues[res.sender];
          this.pointValues = newPointValues;
          
          // Update user status to offline
          if (this.userActivity[res.sender]) {
            this.userActivity = {
              ...this.userActivity,
              [res.sender]: {
                ...this.userActivity[res.sender],
                status: 'offline'
              }
            };
          }
          break;
        case 'points':
          if (this.showChart) {
            this.confettiShot = true;
          }
          
          // Update pointValues - create new object for change detection
          this.pointValues = { ...this.pointValues, [res.sender]: res.content };
          
          if (res.sender === this.name && res.content === undefined) {
            this.selectedPointValue = 0;
            if (!this.showChart) {
              this.confettiShot = false
            }
          }
          break;
        case 'chat':
          this.chatLog.push(res);
          break;
        case 'description':
          this.updateDescription(res.content);
          break;
        case 'heartbeat':
          // Activity is already updated above, nothing else needed for heartbeats
          break;
        case 'join':
          // Add to chat log as a system message
          this.chatLog.push(res);
          // Set a flag to show notification
          if (res.sender !== this.name) {
            this.newUserJoined = true;
            this.recentJoinedUser = res.sender;
            // Auto-clear after 5 seconds
            setTimeout(() => {
              this.newUserJoined = false;
              this.recentJoinedUser = '';
            }, 5000);
          }
          break;
        default:
          break;
      }
    }
  }

  public send(content: string | number, type: any = 'points'): void {
    const message = new Message(this.name, content, this.id, type);
    
    if (type === 'heartbeat') {
      console.log('💓 Sending heartbeat');
    } else {
      console.group('📤 Sending Message');
      console.log('Type:', type);
      console.log('Content:', content);
      console.log('Sender:', this.name);
      console.groupEnd();
    }
    
    this.webSocket.next(message);
  }

  public sendChat(): void {
    this.send(this.chatForm.value.message, 'chat');
    this.scrollToBottom();
    this.chatForm.setValue({ message: '' });
  }

  public createChatForm() {
    this.messageControl = new TextBoxControl({
      key: 'message',
      required: false,
      placeholder: 'Send Message',
    });
    this.chatForm = this.formUtils.toFormGroup([this.messageControl]);
  }

  public createForm() {
    this.nameControl = new TextBoxControl({
      key: 'storyDescription',
      required: false,
      placeholder: 'Story Description',
      interactions: [{
        event: 'change', script: (API: FieldInteractionApi) => {
          if (API.getActiveValue() !== this.lastDescription) {
            this.send(API.getActiveValue(), 'description');
          }
        }
      }]
    });
    this.form = this.formUtils.toFormGroup([this.nameControl]);
  }

  private updateDescription(description: any): void {
    this.lastDescription = description;
    this.form.setValue({ storyDescription: description });
  }

  public scrollToBottom(): void {
    try {
      this.scroller.nativeElement.scrollTop = this.scroller.nativeElement.scrollHeight;
    } catch (err) { }
  }

  private getPointValueCountObject() {
    let pointValueCounts = {};
    let point: number;
    for (const user in this.pointValues) {
      if (this.pointValues.hasOwnProperty(user) && this.pointValues[user] !== 'disconnect' &&  this.pointValues[user]) {
        point = this.pointValues[user]
        pointValueCounts[point] = pointValueCounts[point] ? pointValueCounts[point] + 1 : 1;
      }
    }
    return pointValueCounts;
  }
}
