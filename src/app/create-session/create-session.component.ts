import { Component, OnInit } from '@angular/core';
import { NovoModalRef } from 'novo-elements';

@Component({
  selector: 'app-create-session',
  templateUrl: './create-session.component.html',
  styleUrls: ['./create-session.component.scss']
})
export class CreateSessionComponent implements OnInit {

  constructor(public modalRef: NovoModalRef) { }

  ngOnInit() {
  }

  public close(): void {
    this.modalRef.close(undefined);
  }

  public save(): void {
    this.modalRef.close(undefined);
  }

}
