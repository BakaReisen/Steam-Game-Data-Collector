import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DataCollectionComponent } from './components/data-collection/data-collection.component';
import { ReviewCollectionComponent } from './components/review-collection/review-collection.component';
import { ModelTrainingComponent } from './components/model-training/model-training.component';
import { DataCleaningComponent } from './components/data-cleaning/data-cleaning.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'data-collection', component: DataCollectionComponent },
  { path: 'review-collection', component: ReviewCollectionComponent },
  { path: 'model-training', component: ModelTrainingComponent },
  { path: 'data-cleaning', component: DataCleaningComponent },
  { path: '**', redirectTo: '' }
];
