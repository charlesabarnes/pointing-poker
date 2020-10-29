import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-consensus',
  templateUrl: './consensus.component.html',
  styleUrls: ['./consensus.component.scss']
})
export class ConsensusComponent implements OnInit {

  public visible = false;
  public get text() {
    return `${this.points} point${this.points > 1 ? 's' : ''}!`;
  }
  private points: number;
  private hideTimeout: any;

  constructor() { }

  static preload(...args: any[]): void {
    for (const arg of args) {
      const img: HTMLImageElement = new Image();
      img.src = arg;
    }
  }

  ngOnInit() {
    console.log(`ConsensusComponent ngOnInit`); // tslint:disable-line
    ConsensusComponent.preload(
      'assets/images/ribbon-center.png',
      'assets/images/ribbon-text.png',
      'assets/images/ribbon-outer.png',
      'assets/images/leaves.png',
    );
  }

  public show(points: number): void {
    this.points = points;
    this.visible = true;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.visible = false;
    }, 4000);
  }

}
