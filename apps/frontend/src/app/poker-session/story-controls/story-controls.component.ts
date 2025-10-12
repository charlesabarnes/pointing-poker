import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStickyNote, faTimes, faEye } from '@fortawesome/pro-solid-svg-icons';
import { PokerSessionStateService } from '../../services/poker-session-state.service';

@Component({
  selector: 'app-story-controls',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FontAwesomeModule
  ],
  templateUrl: './story-controls.component.html',
  styleUrls: ['./story-controls.component.scss']
})
export class StoryControlsComponent implements OnInit {
  // Icons
  faStickyNote = faStickyNote;
  faTimes = faTimes;
  faEye = faEye;

  // Form
  public form: FormGroup;

  constructor(public stateService: PokerSessionStateService) {
    // Effect to sync description from state service to form
    effect(() => {
      const description = this.stateService.description();
      if (description !== this.form?.value.storyDescription) {
        this.form?.setValue({ storyDescription: description }, { emitEvent: false });
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

    // Listen for changes to the story description
    this.form.get('storyDescription').valueChanges.subscribe(value => {
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
