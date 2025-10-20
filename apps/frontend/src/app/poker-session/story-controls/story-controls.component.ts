import { Component, OnInit, effect, inject, DestroyRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStickyNote, faTimes, faEye } from '@fortawesome/pro-solid-svg-icons';
import { SessionStateService } from '../../services/session-state.service';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { TimerControlsComponent } from '../timer-controls/timer-controls.component';

@Component({
  selector: 'app-story-controls',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FontAwesomeModule,
    TimerDisplayComponent,
    TimerControlsComponent
  ],
  templateUrl: './story-controls.component.html',
  styleUrls: ['./story-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoryControlsComponent implements OnInit {
  faStickyNote = faStickyNote;
  faTimes = faTimes;
  faEye = faEye;

  public form: FormGroup;
  public stateService = inject(SessionStateService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      const description = this.stateService.description();
      if (description !== this.form?.value?.storyDescription) {
        this.form?.setValue({ storyDescription: description }, { emitEvent: false });
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.createForm();
  }

  private createForm(): void {
    this.form = new FormGroup({
      storyDescription: new FormControl('')
    });

    this.form.get('storyDescription').valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      if (value !== this.stateService.description()) {
        this.stateService.updateDescription(value);
      }
    });
  }

  public onClearVotes(): void {
    this.stateService.clearVotes();
  }

  public onShowVotes(): void {
    this.stateService.forceShowValues();
  }
}
