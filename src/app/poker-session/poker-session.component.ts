import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WebSocketSubject, webSocket } from 'rxjs/websocket';
export class Message {
  constructor(
    public sender: string,
    public content: string
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

  constructor(private route: ActivatedRoute) { }

  public ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.name = sessionStorage.getItem('POKER_NAME');
    this.webSocket.subscribe(this.handleSocketUpdates.bind(this))
  }

  get webSocket(): WebSocketSubject<any> {
    if (typeof this._webSocket ===  'undefined') {
      this._webSocket = webSocket(`ws://${location.host}/`);
    }
    return this._webSocket;
  }

  get userNames(): string[] {
    return Object.keys(this.pointValues);
  }

  private handleSocketUpdates(res: any): void {
    if (res) {
      this.pointValues[res.sender] = res.content;
    }
  }

  public send(pointValue: string): void {
    const message = new Message(this.name, pointValue);
    this.webSocket.next(message);
  }
}
