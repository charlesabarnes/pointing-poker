import { Component, OnInit, ElementRef, AfterViewChecked, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComments, faPaperPlane, faUserPlus } from '@fortawesome/pro-solid-svg-icons';
import { SessionCoordinatorService } from '../../services/session-coordinator.service';
import { SessionStateService } from '../../services/session-state.service';
import { ToastNotificationService } from '../../services/toast-notification.service';

@Component({
  selector: 'app-chat-panel',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FontAwesomeModule
  ],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss']
})
export class ChatPanelComponent implements OnInit, AfterViewChecked {
  faComments = faComments;
  faPaperPlane = faPaperPlane;
  faUserPlus = faUserPlus;

  public chatForm: FormGroup;
  private sessionCoordinator = inject(SessionCoordinatorService);
  public stateService = inject(SessionStateService);
  private toastService = inject(ToastNotificationService);

  private scroller = viewChild<ElementRef>('scroller');

  ngOnInit(): void {
    this.createChatForm();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
    const chatForm = document.querySelector('.chat form');
    if (chatForm) {
      chatForm.setAttribute('autocomplete', 'off');
    }
  }

  private createChatForm(): void {
    this.chatForm = new FormGroup({
      message: new FormControl('')
    });
  }

  public sendChat(): void {
    try {
      const message = this.chatForm.value.message;
      if (message && message.trim()) {
        this.sessionCoordinator.send(message, 'chat');
        this.chatForm.setValue({ message: '' });
        this.scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
      this.toastService.error('Failed to send chat message. Please try again.');
    }
  }

  private scrollToBottom(): void {
    const scrollerEl = this.scroller();
    if (scrollerEl?.nativeElement) {
      try {
        scrollerEl.nativeElement.scrollTop = scrollerEl.nativeElement.scrollHeight;
      } catch (err) {
        console.warn('Failed to scroll chat to bottom:', err);
      }
    }
  }
}
