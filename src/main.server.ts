import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppComponent } from './app/app.component';
import { NoSessionComponent } from './app/no-session/no-session.component';
import { PokerSessionComponent } from './app/poker-session/poker-session.component';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

const routes = [
  { path: '', component: NoSessionComponent },
  { path: 'session/:id', component: PokerSessionComponent },
];

const bootstrap = () => bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideCharts(withDefaultRegisterables()),
  ]
});

export default bootstrap;
