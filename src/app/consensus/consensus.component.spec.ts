import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsensusComponent } from './consensus.component';

describe('ConsensusComponent', () => {
  let component: ConsensusComponent;
  let fixture: ComponentFixture<ConsensusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConsensusComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsensusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
