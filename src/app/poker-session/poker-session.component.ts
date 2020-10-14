import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { NovoFormGroup, TextBoxControl, FormUtils, FieldInteractionApi } from 'novo-elements';
import { ChartOptions, ChartType } from 'chart.js';
import { Label } from 'ng2-charts';
export class Message {
  constructor(
    public sender: string,
    public content: string | number,
    public session: string,
    public type: 'chat' | 'points' | 'action' | 'disconnect' | 'description',
  ) { }
}
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
  @ViewChild('scroller') private scroller: ElementRef;

  constructor(private route: ActivatedRoute, public formUtils: FormUtils) { }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    if (this.name) {
      this.webSocket.subscribe(this.handleSocketUpdates.bind(this));
      this.createForm();
      this.createChatForm();
    }
  }

  public ngAfterViewChecked() {
    this.scrollToBottom();
    document.querySelector('.chat .novo-form').setAttribute('autocomplete', 'off');
  }

  get webSocket(): WebSocketSubject<any> {
    if (typeof this._webSocket === 'undefined') {
      this._webSocket = webSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host.replace('4200', '4000')}/?session=${this.id}`
      );
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
  }

  get spectator(): boolean {
    return this._spectator;
  }

  set spectator(value: boolean) {
    this._spectator = value;
    this.send(value ? 'spectate' : 0);
  }

  private handleSocketUpdates(res: Message): void {
    if (res && res.sender !== 'NS') {
      switch (res.type) {
        case 'disconnect':
          delete this.pointValues[res.sender];
          break;
        case 'points':
          this.pointValues[res.sender] = res.content;
          if (res.sender === this.name && res.content === undefined) {
            this.selectedPointValue = 0;
          }
          break;
        case 'chat':
          this.chatLog.push(res);
          break;
        case 'description':
          this.updateDescription(res.content);
          break;
        default:
          break;
      }
    }
  }

  public send(content: string | number, type: any = 'points'): void {
    const message = new Message(this.name, content, this.id, type);
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

  scrollToBottom(): void {
    try {
      this.scroller.nativeElement.scrollTop = this.scroller.nativeElement.scrollHeight;
    } catch (err) { }
  }

  public pointDistributionChartOptions: ChartOptions = {
    responsive: true,
    legend: {
      position: 'top',
    },
  };

  get showChart(): boolean {
    return this.showValues && Object.keys(this.pointValues).length > 0;
  }

  private getPointValueCountObject() {
    let pointValueCounts = {};
    let point: number;
    for (const user in this.pointValues) {
      if (this.pointValues.hasOwnProperty(user)) {
        point = this.pointValues[user]
        pointValueCounts[point] = pointValueCounts[point] ? pointValueCounts[point]++ : 1;
      }
    }
    return pointValueCounts;
  }

  get pointDistributionChartData(): number[] {
    const pointValueCounts = this.getPointValueCountObject();
    let data: number[] = [];
    for (const pointValue in pointValueCounts) {
      if (this.pointValues.hasOwnProperty(pointValue)) {
        data.push(pointValueCounts[pointValue]);
      }
    }
    return data;
  };
  get pointDistributionChartLabels(): Label[] {
    const pointValueCounts = this.getPointValueCountObject();
    let data: string[] = [];
    for (const pointValue in pointValueCounts) {
      if (this.pointValues.hasOwnProperty(pointValue)) {
        data.push(pointValue);
      }
    }
    return data;
  }
  public pointDistributionChartType: ChartType = 'pie';
  public showLegend = true;
  public pieChartColors = [
    {
      backgroundColor: ['rgba(255,0,0,0.3)', 'rgba(0,255,0,0.3)', 'rgba(0,0,255,0.3)'],
    },
  ];
}
