import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ChartOptions, ChartType, ChartData } from 'chart.js';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';
import confetti, { create } from 'canvas-confetti';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BaseChartDirective } from 'ng2-charts';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faStickyNote,
  faTimes,
  faEye,
  faFlag,
  faClock,
  faUser,
  faUserPlus,
  faUserCircle,
  faCheckCircle,
  faCircle,
  faQuestionCircle,
  faComments,
  faPaperPlane
} from '@fortawesome/pro-solid-svg-icons';
import { Message, MessageType } from 'shared';

// TODO: clean confetti logic
const createConfettiCanvas = create(undefined, { useWorker: true, resize: true });

@Component({
    selector: 'app-poker-session',
    templateUrl: './poker-session.component.html',
    styleUrls: ['./poker-session.component.scss'],
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      FormsModule,
      MatCardModule,
      MatButtonModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonToggleModule,
      MatSlideToggleModule,
      FontAwesomeModule,
      BaseChartDirective
    ]
})
export class PokerSessionComponent implements OnInit, AfterViewChecked {
  // FontAwesome icons
  faStickyNote = faStickyNote;
  faTimes = faTimes;
  faEye = faEye;
  faFlag = faFlag;
  faClock = faClock;
  faUser = faUser;
  faUserPlus = faUserPlus;
  faUserCircle = faUserCircle;
  faCheckCircle = faCheckCircle;
  faCircle = faCircle;
  faQuestionCircle = faQuestionCircle;
  faComments = faComments;
  faPaperPlane = faPaperPlane;

  public id: string;
  public name: string;
  public _webSocket: WebSocketSubject<any>; // tslint:disable-line
  public pointValues: any = {};
  public selectedPointValue: any;
  public lastDescription = '';
  public chatLog: Message[] = [];
  public form: FormGroup;
  public chatForm: FormGroup;
  public _showValues: boolean = false; // tslint:disable-line
  public _spectator: boolean = false; // tslint:disable-line
  public userActivity: {[key: string]: {lastActive: number, status: 'online' | 'away' | 'offline'}} = {};
  public activityInterval: any;
  public heartbeatInterval: any;
  public newUserJoined: boolean = false;
  public recentJoinedUser: string = '';
  public OFFLINE_THRESHOLD = 60000; // 1 minute with no activity = offline
  public AWAY_THRESHOLD = 30000; // 30 seconds with no activity = away
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
          color: '#fff',
          font: {
            size: 16
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: {
          size: 20,
        },
        formatter: (value, ctx) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label;
        },
      },
    }
  };

  constructor(private route: ActivatedRoute) { }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    if (this.name) {
      this.webSocket.subscribe(this.handleSocketUpdates.bind(this));
      this.createForm();
      this.createChatForm();
      this.setupHeartbeat();
      this.setupActivityMonitor();

      // Announce this user has joined
      setTimeout(() => {
        this.send('has joined the session', 'join');
      }, 1000);
    }
  }

  private setupHeartbeat() {
    // Send heartbeat every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      this.send('', 'heartbeat');
    }, 15000);
  }

  private setupActivityMonitor() {
    // Check user activity status every 10 seconds
    this.activityInterval = setInterval(() => {
      const currentTime = Date.now();

      Object.keys(this.userActivity).forEach(user => {
        const lastActive = this.userActivity[user].lastActive;
        const timeSinceActive = currentTime - lastActive;

        if (timeSinceActive > this.OFFLINE_THRESHOLD) {
          this.userActivity[user].status = 'offline';
        } else if (timeSinceActive > this.AWAY_THRESHOLD) {
          this.userActivity[user].status = 'away';
        }
      });
    }, 10000);
  }

  public ngAfterViewChecked() {
    this.scrollToBottom();
    const chatForm = document.querySelector('.chat form');
    if (chatForm) {
      chatForm.setAttribute('autocomplete', 'off');
    }
  }

  public ngOnDestroy() {
    // Clear intervals when component is destroyed
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }
  }

  get webSocket(): WebSocketSubject<any> {
    if (typeof this._webSocket === 'undefined') {
      this._webSocket = webSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host.replace('4200', '4000')}/?session=${this.id}`
      );
      this._webSocket.next(new Message(this.name, undefined, 'points', this.id));
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
  }

  get spectator(): boolean {
    return this._spectator;
  }

  set spectator(value: boolean) {
    this._spectator = value;
    this.send(value ? 'spectate' : 0);
  }

  get pointDistributionChartData(): number[] {
    const pointValueCounts = this.getPointValueCountObject();
    let data: number[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValueCounts[pointValue]);
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
    
    return data;
  }

  get pointDistributionChartLabels(): string[] {
    const pointValueCounts = this.getPointValueCountObject();
    let data: string[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValue);
      }
    }
    return data;
  }

  get showChart(): boolean {
    return this.showValues && Object.keys(this.pointValues).length > 0;
  }

  private handleSocketUpdates(res: Message): void {
    if (res && res.sender !== 'NS') {
      // Update user activity on any message received
      if (!this.userActivity[res.sender]) {
        this.userActivity[res.sender] = {
          lastActive: res.timestamp || Date.now(),
          status: 'online'
        };
      } else {
        this.userActivity[res.sender].lastActive = res.timestamp || Date.now();
        this.userActivity[res.sender].status = 'online';
      }

      switch (res.type) {
        case 'disconnect':
          delete this.pointValues[res.sender];
          if (this.userActivity[res.sender]) {
            this.userActivity[res.sender].status = 'offline';
          }
          break;
        case 'points':
          if (this.showChart) {
            this.confettiShot = true;
          }
          this.pointValues[res.sender] = res.content;
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
          // Just update the user's activity status
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
    const message = new Message(this.name, content, type, this.id);
    this.webSocket.next(message);
  }

  public sendChat(): void {
    this.send(this.chatForm.value.message, 'chat');
    this.scrollToBottom();
    this.chatForm.setValue({ message: '' });
  }

  public createChatForm() {
    this.chatForm = new FormGroup({
      message: new FormControl('')
    });
  }

  public createForm() {
    this.form = new FormGroup({
      storyDescription: new FormControl('')
    });

    // Listen for changes to the story description
    this.form.get('storyDescription').valueChanges.subscribe(value => {
      if (value !== this.lastDescription) {
        this.send(value, 'description');
      }
    });
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
