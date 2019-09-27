import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import {
  NovoFormModule,
  NovoElementsModule,
  NovoModalService,
  FieldInteractionApi,
  NovoToastService,
  NovoTilesModule
} from 'novo-elements';
import { PokerSessionComponent } from './poker-session/poker-session.component';
import { CreateSessionComponent } from './create-session/create-session.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NoSessionComponent } from './no-session/no-session.component';
import { ClipboardModule } from 'ngx-clipboard';

const appRoutes: Routes = [
  { path: '', component: NoSessionComponent },
  { path: 'session/:id', component: PokerSessionComponent },
];

@NgModule({
   declarations: [
      AppComponent,
      PokerSessionComponent,
      CreateSessionComponent,
      NoSessionComponent
   ],
   imports: [
      BrowserModule.withServerTransition({ appId: 'serverApp'}),
      NovoElementsModule,
      NovoFormModule,
      NovoTilesModule,
      ReactiveFormsModule,
      FormsModule,
      BrowserAnimationsModule,
      RouterModule.forRoot( appRoutes, { enableTracing: false, useHash: false }),
      ClipboardModule
  ],
  providers: [
    NovoModalService,
    FieldInteractionApi,
    NovoToastService
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    CreateSessionComponent
  ]
})
export class AppModule { }
