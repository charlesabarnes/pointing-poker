import { Component, OnInit } from '@angular/core';
import { NovoModalRef, NovoFormGroup, TextBoxControl, FormUtils } from 'novo-elements';

@Component({
  selector: 'app-create-session',
  templateUrl: './create-session.component.html',
  styleUrls: ['./create-session.component.scss']
})
export class CreateSessionComponent implements OnInit {

  public form: NovoFormGroup;
  public nameControl: TextBoxControl;

  constructor(public modalRef: NovoModalRef, public formUtils: FormUtils) { }

  public ngOnInit() {
    this.createForm();
  }

  public close(): void {
    this.modalRef.close(undefined);
  }

  public save(): void {
    this.modalRef.close(this.form.value.name);
  }

  public createForm() {
    this.nameControl = new TextBoxControl({
      key: 'name',
      required: true,
      placeholder: 'Please Enter Name'
    });
    this.form = this.formUtils.toFormGroup([this.nameControl]);
  }

}
