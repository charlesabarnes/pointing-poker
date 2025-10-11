import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-create-session',
    templateUrl: './create-session.component.html',
    styleUrls: ['./create-session.component.scss'],
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      MatButtonModule,
      MatFormFieldModule,
      MatInputModule,
      MatIconModule,
      MatDialogModule
    ]
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
