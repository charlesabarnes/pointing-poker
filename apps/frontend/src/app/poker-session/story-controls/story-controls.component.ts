import { Component, OnInit, Output, EventEmitter, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStickyNote, faTimes, faEye } from '@fortawesome/pro-solid-svg-icons';
import { PokerWebSocketService } from '../../services/poker-websocket.service';

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

  // Outputs
  @Output() clearVotes = new EventEmitter<void>();
  @Output() showVotes = new EventEmitter<void>();

  constructor(private wsService: PokerWebSocketService) {
    // Effect to sync description from service to form
    effect(() => {
      const description = this.wsService.lastDescription();
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
      if (value !== this.wsService.lastDescription()) {
        this.wsService.send(value, 'description');
      }
    });
  }

  public onClearVotes(): void {
    this.clearVotes.emit();
  }

  public onShowVotes(): void {
    this.showVotes.emit();
  }
}
