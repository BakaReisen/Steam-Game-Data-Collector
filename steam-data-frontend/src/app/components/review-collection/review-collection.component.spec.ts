import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewCollectionComponent } from './review-collection.component';

describe('ReviewCollectionComponent', () => {
  let component: ReviewCollectionComponent;
  let fixture: ComponentFixture<ReviewCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewCollectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
