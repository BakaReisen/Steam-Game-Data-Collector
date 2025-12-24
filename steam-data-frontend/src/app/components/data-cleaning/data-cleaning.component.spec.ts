import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataCleaningComponent } from './data-cleaning.component';

describe('DataCleaningComponent', () => {
  let component: DataCleaningComponent;
  let fixture: ComponentFixture<DataCleaningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataCleaningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataCleaningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
