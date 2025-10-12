import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ChartOptions, ChartType } from 'chart.js';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';
import { create } from 'canvas-confetti';
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
import { PointOption } from 'shared';
import { PokerWebSocketService } from '../services/poker-websocket.service';

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
export class PokerSessionComponent implements OnInit, AfterViewChecked, OnDestroy {
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

  // Session data
  public id: string;
  public name: string;
  public form: FormGroup;
  public chatForm: FormGroup;

  // Local component signals
  public selectedPointValue = signal<number | undefined>(undefined);
  public _showValues = signal<boolean>(false);
  public _spectator = signal<boolean>(false);
  public confettiShot = signal<boolean>(false);

  // Signals from WebSocket service (exposed for template)
  public pointValues = this.wsService.pointValues;
  public chatLog = this.wsService.chatLog;
  public userActivity = this.wsService.userActivity;
  public newUserJoined = this.wsService.newUserJoined;
  public recentJoinedUser = this.wsService.recentJoinedUser;

  public options: PointOption[] = [
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

  // Computed signals
  public userNames = computed(() => Object.keys(this.pointValues()));

  public showValues = computed(() => {
    const allVoted = this.userNames().filter((name: string) => {
      return !this.pointValues()[name];
    }).length === 0;
    return allVoted || this._showValues();
  });

  public showChart = computed(() => {
    return this.showValues() && Object.keys(this.pointValues()).length > 0;
  });

  public pointDistributionChartData = computed(() => {
    const pointValueCounts = this.getPointValueCountObject();
    const data: number[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValueCounts[pointValue]);
      }
    }

    // Trigger confetti if consensus is reached
    if (Object.keys(pointValueCounts).length === 1 && !this.confettiShot()) {
      createConfettiCanvas({
        shapes: ['square'],
        particleCount: 100,
        spread: 70,
        angle: 42,
      });
      this.confettiShot.set(true);
    }

    return data;
  });

  public pointDistributionChartLabels = computed(() => {
    const pointValueCounts = this.getPointValueCountObject();
    const data: string[] = [];
    for (const pointValue in pointValueCounts) {
      if (pointValueCounts.hasOwnProperty(pointValue)) {
        data.push(pointValue);
      }
    }
    return data;
  });

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
        formatter: (_value, ctx) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label;
        },
      },
    }
  };

  constructor(
    private route: ActivatedRoute,
    private wsService: PokerWebSocketService
  ) {
    // Effect to sync description from service to form
    effect(() => {
      const description = this.wsService.lastDescription();
      if (description !== this.form?.value.storyDescription) {
        this.form?.setValue({ storyDescription: description }, { emitEvent: false });
      }
    });

    // Effect to handle spectator mode changes
    effect(() => {
      const spectator = this._spectator();
      this.wsService.send(spectator ? 'spectate' : 0);
    });

    // Effect to reset selected value when current user's points are cleared
    effect(() => {
      const points = this.pointValues();
      if (this.name && points[this.name] === undefined) {
        this.selectedPointValue.set(0);
        if (!this.showChart()) {
          this.confettiShot.set(false);
        }
      }
    });

    // Effect to set confetti flag when chart appears (after voting)
    effect(() => {
      if (this.showChart()) {
        this.confettiShot.set(true);
      }
    });
  }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    if (this.name) {
      // Connect to WebSocket
      this.wsService.connect(this.id, this.name);

      // Create forms
      this.createForm();
      this.createChatForm();
    }
  }

  public ngAfterViewChecked() {
    this.scrollToBottom();
    const chatForm = document.querySelector('.chat form');
    if (chatForm) {
      chatForm.setAttribute('autocomplete', 'off');
    }
  }

  public ngOnDestroy() {
    // Disconnect from WebSocket
    this.wsService.disconnect();
  }

  public doShowValues(): void {
    this._showValues.set(true);
  }

  public clearVotes(): void {
    this._showValues.set(false);
    this.confettiShot.set(false);
    this.wsService.clearVotes();
  }

  public send(content: string | number, type: any = 'points'): void {
    this.wsService.send(content, type);
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
      if (value !== this.wsService.lastDescription()) {
        this.send(value, 'description');
      }
    });
  }

  public scrollToBottom(): void {
    try {
      this.scroller.nativeElement.scrollTop = this.scroller.nativeElement.scrollHeight;
    } catch (err) { }
  }

  private getPointValueCountObject() {
    let pointValueCounts: Record<string, number> = {};
    let point: number;
    const values = this.pointValues();
    for (const user in values) {
      if (values.hasOwnProperty(user) && values[user] !== 'disconnect' && values[user]) {
        point = values[user] as number;
        pointValueCounts[point] = pointValueCounts[point] ? pointValueCounts[point] + 1 : 1;
      }
    }
    return pointValueCounts;
  }
}
