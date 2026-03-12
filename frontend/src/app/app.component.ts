import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkService, Device, ScanResponse, StatsResponse } from './services/network.service';
import { Subscription, interval } from 'rxjs';
import { Chart, registerables } from 'chart.js';
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
  History,
  ChevronRight,
  Shield
} from 'lucide-angular';

Chart.register(...registerables);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule
  ],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  // Icons as names for the template
  readonly WifiIcon = 'wifi';
  readonly SearchIcon = 'search';
  readonly RefreshIcon = 'refresh-ccw';
  readonly AlertIcon = 'shield-alert';
  readonly MonitorIcon = 'monitor';
  readonly PhoneIcon = 'smartphone';
  readonly LaptopIcon = 'laptop';
  readonly ProcessorIcon = 'cpu';
  readonly TvIcon = 'tv';
  readonly RouterIcon = 'hard-drive';
  readonly ActivityIcon = 'activity';
  readonly SecurityIcon = 'shield-check';
  readonly TerminalIcon = 'terminal';
  readonly HistoryIcon = 'history';
  readonly ChevronIcon = 'chevron-right';
  readonly ShieldIcon = 'shield';

  devices: Device[] = [];
  filteredDevices: Device[] = [];
  stats: any = {
    total: 0,
    online: 0,
    offline: 0,
    unknown: 0,
    vulnerabilities: 0
  };
  
  searchTerm: string = '';
  isScanning: boolean = false;
  lastUpdated: Date = new Date();
  
  // Nmap Scan State
  selectedDevice: Device | null = null;
  showScanCenter: boolean = false;
  activeNmapScan: any = null;
  nmapHistory: any[] = [];
  scanTypes = [
    { id: 'quick', name: 'Quick Scan', description: 'Fast discovery of common ports' },
    { id: 'standard', name: 'Standard Scan', description: 'Port scan with service detection' },
    { id: 'full', name: 'Full Port Scan', description: 'Scan all 65535 ports (slow)' },
    { id: 'os', name: 'OS Detection', description: 'Determine operating system' },
    { id: 'vuln', name: 'Vulnerability Scan', description: 'Check for known vulnerabilities' },
    { id: 'traceroute', name: 'Traceroute', description: 'Analyze network path' },
    { id: 'aggressive', name: 'Aggressive Scan', description: 'All detection methods combined' }
  ];
  selectedScanType: string = 'standard';
  nmapPollingSub: Subscription | null = null;
  
  @ViewChild('typeChart') typeChartRef!: ElementRef;
  @ViewChild('vendorChart') vendorChartRef!: ElementRef;
  
  private typeChart?: Chart;
  private vendorChart?: Chart;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.refreshData();
    
    // Auto refresh every 30 seconds
    const autoRefresh = interval(30000).subscribe(() => {
      this.refreshData();
    });
    this.subscriptions.add(autoRefresh);
  }

  ngAfterViewInit() {
    // Charts will be initialized when data arrives
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  refreshData() {
    if (this.isScanning) {
      console.log('Scan already in progress, skipping...');
      return;
    }
    
    this.isScanning = true;
    this.cdr.detectChanges();
    console.log('Refreshing network data using consolidated API...');
    
    this.networkService.getFullScanData().subscribe({
      next: (res) => {
        console.log('RAW Response received:', res);
        if (res && res.success) {
          this.devices = res.devices || [];
          this.stats = res.stats || {
            total: 0,
            online: 0,
            offline: 0,
            unknown: 0
          };
          
          console.log(`UI State Updated: ${this.devices.length} devices found.`);
          console.log('Stats:', this.stats);
          
          this.filterDevices();
          this.lastUpdated = new Date();
          
          // Force change detection
          this.cdr.detectChanges();
          
          // Use setTimeout to ensure DOM is updated before charts are rendered
          setTimeout(() => {
            try {
              this.updateCharts();
              this.cdr.detectChanges();
            } catch (e) {
              console.error('Chart update error:', e);
            }
          }, 200);
        } else {
          console.warn('Response success was false or res was null', res);
        }
        this.isScanning = false;
        this.cdr.detectChanges();
        
        // Refresh vulnerabilities from history if needed
        this.updateVulnerabilityStats();
      },
      error: (err) => {
        console.error('Scan API error:', err);
        this.isScanning = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateVulnerabilityStats() {
    let totalVulns = 0;
    // This is a simple heuristic: count devices that have at least one scan with scripts in history
    // In a real app, you'd fetch this from a dedicated stats endpoint
    this.devices.forEach(device => {
      this.networkService.getNmapHistory(device.ip).subscribe(res => {
        if (res.success && res.history.length > 0) {
          const latestScan = res.history[0];
          if (latestScan.result?.ports?.some((p: any) => p.script?.length > 0)) {
            totalVulns++;
            this.stats.vulnerabilities = totalVulns;
            this.cdr.detectChanges();
          }
        }
      });
    });
  }

  filterDevices() {
    if (!this.searchTerm.trim()) {
      this.filteredDevices = [...this.devices];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDevices = this.devices.filter(d => 
        d.ip.toLowerCase().includes(term) ||
        d.mac.toLowerCase().includes(term) ||
        d.vendor.toLowerCase().includes(term) ||
        d.type.toLowerCase().includes(term)
      );
    }
  }

  updateCharts() {
    if (!this.typeChartRef || !this.vendorChartRef) return;

    const deviceTypes = this.devices.reduce((acc: any, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {});

    const vendors = this.devices.reduce((acc: any, d) => {
      acc[d.vendor] = (acc[d.vendor] || 0) + 1;
      return acc;
    }, {});

    this.renderTypeChart(deviceTypes);
    this.renderVendorChart(vendors);
  }

  renderTypeChart(data: any) {
    if (this.typeChart) this.typeChart.destroy();
    
    const ctx = this.typeChartRef.nativeElement.getContext('2d');
    this.typeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data) as any[],
          backgroundColor: [
            '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  renderVendorChart(data: any) {
    if (this.vendorChart) this.vendorChart.destroy();
    
    const ctx = this.vendorChartRef.nativeElement.getContext('2d');
    this.vendorChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(data).slice(0, 5), // Top 5
        datasets: [{
          label: 'Devices by Vendor',
          data: Object.values(data).slice(0, 5) as any[],
          backgroundColor: '#0ea5e980',
          borderColor: '#0ea5e9',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    });
  }

  getDeviceIcon(type: string) {
    switch (type) {
      case 'Mobile': return this.PhoneIcon;
      case 'Computer': return this.LaptopIcon;
      case 'Monitor': return this.MonitorIcon;
      case 'Router': return this.RouterIcon;
      case 'Smart TV': return this.TvIcon;
      case 'IoT Device': return this.ProcessorIcon;
      default: return this.MonitorIcon;
    }
  }

  // --- Nmap Logic ---

  openScanCenter(device: Device) {
    this.selectedDevice = device;
    this.showScanCenter = true;
    this.activeNmapScan = null;
    this.loadHistory(device.ip);
  }

  closeScanCenter() {
    this.showScanCenter = false;
    this.stopPolling();
  }

  startNmapScan() {
    if (!this.selectedDevice) return;

    this.activeNmapScan = { status: 'starting', progress: 0 };
    this.networkService.startNmapScan(this.selectedDevice.ip, this.selectedScanType).subscribe({
      next: (res) => {
        if (res.success) {
          this.pollScanStatus(res.scanId);
        }
      },
      error: (err) => {
        this.activeNmapScan = { status: 'failed', error: err.message };
      }
    });
  }

  pollScanStatus(scanId: string) {
    this.stopPolling();
    this.nmapPollingSub = interval(2000).subscribe(() => {
      this.networkService.getNmapStatus(scanId).subscribe({
        next: (res) => {
          if (res.success) {
            this.activeNmapScan = res.scan;
            if (res.scan.status === 'completed' || res.scan.status === 'failed') {
              this.stopPolling();
              if (this.selectedDevice) this.loadHistory(this.selectedDevice.ip);
            }
          }
        },
        error: (err) => {
          console.error('Polling error:', err);
          this.stopPolling();
        }
      });
    });
    this.subscriptions.add(this.nmapPollingSub);
  }

  stopPolling() {
    if (this.nmapPollingSub) {
      this.nmapPollingSub.unsubscribe();
      this.nmapPollingSub = null;
    }
  }

  loadHistory(ip: string) {
    this.networkService.getNmapHistory(ip).subscribe({
      next: (res) => {
        if (res.success) {
          this.nmapHistory = res.history;
        }
      }
    });
  }

  selectHistoryResult(scan: any) {
    this.activeNmapScan = scan;
  }
}
