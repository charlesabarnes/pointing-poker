import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { NovoFormModule, NovoElementsModule, NovoModalService } from 'novo-elements';
import { PokerSessionComponent } from './poker-session/poker-session.component';
import { CreateSessionComponent } from './create-session/create-session.component';

const appRoutes: Routes = [
  { path: '', component: PokerSessionComponent },
  { path: 'session/:id', component: PokerSessionComponent },
];

@NgModule({
   declarations: [
      AppComponent,
      PokerSessionComponent,
      CreateSessionComponent
   ],
   imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    NovoElementsModule,
    NovoFormModule,
    RouterModule.forRoot( appRoutes, { enableTracing: false, useHash: false }),
  ],
  providers: [NovoModalService],
  bootstrap: [AppComponent],
  entryComponents: [
    CreateSessionComponent
  ]
})
export class AppModule { }
