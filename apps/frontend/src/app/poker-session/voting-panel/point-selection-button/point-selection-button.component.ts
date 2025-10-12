import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PointOption } from 'shared';

@Component({
  selector: 'app-point-selection-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './point-selection-button.component.html',
  styleUrls: ['./point-selection-button.component.scss']
})
export class PointSelectionButtonComponent {
  @Input() option!: PointOption;
  @Input() isSelected: boolean = false;
  @Output() selected = new EventEmitter<number>();

  onSelect(): void {
    if (!this.option.disabled) {
      this.selected.emit(this.option.value);
    }
  }
}
