import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
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
import { ScrollDispatchModule } from './types/scroll-dispatch-module';
import { PokerSessionComponent } from './poker-session/poker-session.component';
import { CreateSessionComponent } from './create-session/create-session.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NoSessionComponent } from './no-session/no-session.component';
import { ClipboardModule } from 'ngx-clipboard';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

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
      ClipboardModule,
      BaseChartDirective,
      ScrollDispatchModule
  ],
  providers: [
    NovoModalService,
    FieldInteractionApi,
    NovoToastService,
    provideCharts(withDefaultRegisterables()),
    // Add a provider for ScrollDispatchModule
    { provide: 'ScrollDispatchModule', useValue: {} }
  ],
  bootstrap: [AppComponent],
  exports: [
    BaseChartDirective
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA,
    NO_ERRORS_SCHEMA
  ]
})
export class AppModule { }
