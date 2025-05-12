import { NgModule } from '@angular/core';

/**
 * This is a dummy implementation to satisfy novo-elements' dependency on ScrollDispatchModule,
 * which is no longer available in Angular CDK. This is needed for compatibility with Angular 15.
 */
@NgModule({
  exports: []
})
export class ScrollDispatchModule {}