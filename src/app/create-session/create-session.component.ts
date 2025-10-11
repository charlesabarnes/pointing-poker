import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
    selector: 'app-create-session',
    templateUrl: './create-session.component.html',
    styleUrls: ['./create-session.component.scss'],
    standalone: false
})
export class CreateSessionComponent implements OnInit {

  public form: FormGroup;

  constructor(public dialogRef: MatDialogRef<CreateSessionComponent>) { }

  public ngOnInit() {
    this.createForm();
  }

  public close(): void {
    this.dialogRef.close(undefined);
  }

  public save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }

  public createForm() {
    this.form = new FormGroup({
      name: new FormControl('', [Validators.required])
    });
  }

}
