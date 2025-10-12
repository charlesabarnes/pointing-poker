import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComments, faPaperPlane, faUserPlus } from '@fortawesome/pro-solid-svg-icons';
import { PokerWebSocketService } from '../../services/poker-websocket.service';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
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
  // Icons
  faComments = faComments;
  faPaperPlane = faPaperPlane;
  faUserPlus = faUserPlus;

  // Form
  public chatForm: FormGroup;

  // ViewChild for auto-scroll
  @ViewChild('scroller', { static: false }) private scroller: ElementRef;

  constructor(public wsService: PokerWebSocketService) {}

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
    const message = this.chatForm.value.message;
    if (message && message.trim()) {
      this.wsService.send(message, 'chat');
      this.chatForm.setValue({ message: '' });
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      this.scroller.nativeElement.scrollTop = this.scroller.nativeElement.scrollHeight;
    } catch (err) { }
  }
}
