import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { 
  LucideAngularModule, 
  Wifi, 
  Search, 
  RefreshCcw, 
  ShieldAlert, 
  Monitor, 
  Smartphone, 
  Laptop, 
  Cpu, 
  Tv, 
  HardDrive,
  Activity,
  ShieldCheck,
  Terminal,
  Shield,
  ChevronRight,
  History as LucideHistory
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(
      LucideAngularModule.pick({ 
        Wifi, 
        Search, 
        RefreshCcw, 
        ShieldAlert, 
        Monitor, 
        Smartphone, 
        Laptop, 
        Cpu, 
        Tv, 
        HardDrive,
        Activity,
        ShieldCheck,
        Terminal,
        History: LucideHistory,
        ChevronRight,
        Shield
      })
    )
  ]
};
