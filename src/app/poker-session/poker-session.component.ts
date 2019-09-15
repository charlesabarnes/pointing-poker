import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/websocket';
import { NovoFormGroup, TextBoxControl, FormUtils } from 'novo-elements';
export class Message {
  constructor(
    public sender: string,
    public content: string,
    public session: string
  ) { }
}
@Component({
  selector: 'app-poker-session',
  templateUrl: './poker-session.component.html',
  styleUrls: ['./poker-session.component.scss']
})
export class PokerSessionComponent implements OnInit {

  public id: string;
  public name: string;
  public _webSocket: WebSocketSubject<any>; // tslint:disable-line
  public pointValues: any = {};
  public selectedPointValue: any;
  public form: NovoFormGroup;
  public nameControl: TextBoxControl;
  public _showValues: boolean = false; // tslint:disable-line
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
  ];

  constructor(private route: ActivatedRoute, public formUtils: FormUtils) { }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    this.webSocket.subscribe(this.handleSocketUpdates.bind(this));
    this.createForm();
  }

  get webSocket(): WebSocketSubject<any> {
    if (typeof this._webSocket ===  'undefined') {
      this._webSocket = webSocket(`ws://${location.host.replace('4200', '4000')}/?session=${this.id}`);
      this._webSocket.next(new Message(this.name, undefined, this.id));
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

  private handleSocketUpdates(res: any): void {
    if (res && res.sender !== 'NS') {
      if (res.content === 'disconnect') {
        delete this.pointValues[res.sender];
      } else {
        this.pointValues[res.sender] = res.content;
      }
    }
  }

  public send(pointValue: string): void {
    const message = new Message(this.name, pointValue, this.id);
    this.webSocket.next(message);
  }

  public createForm() {
    this.nameControl = new TextBoxControl({
      key: 'storyDescription',
      required: false,
      placeholder: 'Story Description',
      interactions: [{event: 'change', script: () => {}}]
    });
    this.form = this.formUtils.toFormGroup([this.nameControl]);
  }
}
