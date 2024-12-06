import { Routes } from '@angular/router';
import { MfcComponent } from './mfc/mfc.component';

export const routes: Routes = [
  {
    path: 'mfc',
    title: 'Mifare Classic',
    component: MfcComponent,
  },
];
