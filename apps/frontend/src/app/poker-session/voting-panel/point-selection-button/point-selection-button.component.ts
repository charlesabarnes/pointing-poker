import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PointOption } from 'shared';

@Component({
  selector: 'app-point-selection-button',
  imports: [CommonModule],
  templateUrl: './point-selection-button.component.html',
  styleUrls: ['./point-selection-button.component.scss']
})
export class PointSelectionButtonComponent {
  option = input.required<PointOption>();
  isSelected = input<boolean>(false);
  selected = output<number>();

  onSelect(): void {
    const opt = this.option();
    if (!opt.disabled) {
      this.selected.emit(opt.value);
    }
  }
}
