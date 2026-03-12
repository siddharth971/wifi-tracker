# 📡 NetWatch AI - Advanced Network Monitoring Dashboard

NetWatch AI is a powerful, full-stack network monitoring and security analysis platform. It provides real-time visibility into your local network, identifying connected devices, monitoring their status, and offering deep security inspection via integrated Nmap capabilities.

![Dashboard Preview](https://via.placeholder.com/1200x600.png?text=NetWatch+AI+Dashboard+Preview)

## 🚀 Key Features

### 1. Real-Time Network Monitoring
*   **Automatic Discovery**: Identifies all active hosts on your private network using hybrid ARP/Ping methods.
*   **Device Identification**: Automatically determines device types (Mobile, Computer, Router, IoT) and identifies manufacturers via MAC vendor lookups.
*   **Live Stats**: Dashboard overview of total devices, online status, and security alerts.

### 2. Advanced Nmap Integration
*   **Deep Scan Center**: A dedicated analysis interface for individual devices.
*   **6 Scan Profiles**:
    *   **Quick Scan**: Fast port discovery.
    *   **Standard Scan**: Service and version detection.
    *   **Full Scan**: Scans all 65,535 ports.
    *   **OS Detection**: Fingerprints the device operating system.
    *   **Vulnerability Scan**: Runs NSE scripts to detect security risks.
    *   **Traceroute**: Maps the network path to the target.
*   **History Engine**: Stores and retrieves previous scan results for longitudinal monitoring.

### 3. Analytics & Visualization
*   **Device Distribution**: Visual charts showing the breakdown of device types and top vendors.
*   **Service Analysis**: Detailed table views of open ports, protocols, and version info.
*   **Security Audit**: Heuristics to identify "Unknown" or potentially vulnerable devices.

## 🛠️ Technical Stack

*   **Frontend**: Angular 21+, Tailwind CSS, Lucide Icons, Chart.js.
*   **Backend**: Node.js, Express, Axios, Node-Cache.
*   **Core Engine**: Nmap (National Mapper), ARP Utilities.

## 📦 Installation & Setup

### Prerequisites
*   **Node.js**: v18+ recommended.
*   **Nmap**: **Mandatory** for Advanced Scanning. Download from [nmap.org](https://nmap.org/download.html) and ensure it's in your system PATH.

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file with:
# PORT=3000
# NETWORK_RANGE=192.168.1.0/24
# CACHE_DURATION=10
node index.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
ng serve
```
Open `http://localhost:4200` in your browser.

## 🔒 Security & Best Practices
*   **Privacy**: This tool is designed for **private networks only** (RFC 1918). It includes built-in filters to block scanning of external/public IPs.
*   **Responsibility**: Always ensure you have permission to scan the network you are monitoring.

## 📄 License
This project is licensed under the ISC License.

---
*Created with ❤️ by Antigravity AI*
