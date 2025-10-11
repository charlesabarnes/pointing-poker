import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { ScrollDispatchModule } from './types/scroll-dispatch-module';
import { PokerSessionComponent } from './poker-session/poker-session.component';
import { CreateSessionComponent } from './create-session/create-session.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NoSessionComponent } from './no-session/no-session.component';
import { ClipboardModule } from 'ngx-clipboard';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

// Angular Material imports
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

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
      BrowserModule,
      ReactiveFormsModule,
      FormsModule,
      BrowserAnimationsModule,
      RouterModule.forRoot( appRoutes, { enableTracing: false, useHash: false }),
      ClipboardModule,
      BaseChartDirective,
      ScrollDispatchModule,
      // Angular Material modules
      MatDialogModule,
      MatCardModule,
      MatButtonModule,
      MatFormFieldModule,
      MatInputModule,
      MatSlideToggleModule,
      MatButtonToggleModule,
      MatToolbarModule,
      MatSnackBarModule,
      MatIconModule,
      MatTooltipModule
  ],
  providers: [
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
