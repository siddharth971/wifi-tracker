import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap, shareReplay, catchError } from 'rxjs/operators';

export interface Device {
  ip: string;
  mac: string;
  vendor: string;
  type: string;
  status: string;
  lastSeen: string;
}

export interface ScanResponse {
  success: boolean;
  source: string;
  timestamp: string;
  devices: Device[];
}

export interface StatsResponse {
  success: boolean;
  stats: {
    total: number;
    online: number;
    offline: number;
    unknown: number;
    types: Record<string, number>;
    vendors: Record<string, number>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getDevices(): Observable<ScanResponse> {
    return this.http.get<ScanResponse>(`${this.apiUrl}/scan`);
  }

  getStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.apiUrl}/stats`);
  }

  // New consolidated method
  getFullScanData(): Observable<ScanResponse & { stats: StatsResponse['stats'] }> {
    return this.http.get<ScanResponse & { stats: StatsResponse['stats'] }>(`${this.apiUrl}/scan-results`);
  }

  // Polling data every 30 seconds
  getDevicesPolling(): Observable<ScanResponse> {
    return timer(0, 30000).pipe(
      switchMap(() => this.getDevices()),
      shareReplay(1)
    );
  }

  getStatsPolling(): Observable<StatsResponse> {
    return timer(0, 30000).pipe(
      switchMap(() => this.getStats()),
      shareReplay(1)
    );
  }

  // --- Nmap Methods ---

  startNmapScan(target: string, type: string = 'standard'): Observable<any> {
    return this.http.post(`${this.apiUrl}/nmap/scan`, { target, type });
  }

  getNmapStatus(scanId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/nmap/status/${scanId}`);
  }

  getNmapHistory(ip: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/nmap/history/${ip}`);
  }
}
