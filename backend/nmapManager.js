const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

class NmapManager {
    constructor() {
        this.scans = new Map();
        this.queue = [];
        this.isProcessing = false;
        this.historyDir = path.join(__dirname, 'scan_history');
        
        if (!fs.existsSync(this.historyDir)) {
            fs.mkdirSync(this.historyDir);
        }
    }

    /**
     * Get scan command based on type
     */
    getScanParams(type, target) {
        const base = 'nmap -oX -';
        switch (type) {
            case 'quick':
                return `${base} -F ${target}`;
            case 'standard':
                return `${base} -sV ${target}`;
            case 'full':
                return `${base} -p- ${target}`;
            case 'service':
                return `${base} -sV --version-intensity 5 ${target}`;
            case 'os':
                return `${base} -O ${target}`;
            case 'vuln':
                return `${base} -sV --script vuln ${target}`;
            case 'traceroute':
                return `${base} --traceroute ${target}`;
            case 'aggressive':
                return `${base} -A ${target}`;
            default:
                return `${base} -F ${target}`;
        }
    }

    /**
     * Validates if the target is a private IP
     */
    isValidTarget(target) {
        const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/;
        return privateIpRegex.test(target) || target === '127.0.0.1' || target === 'localhost';
    }

    /**
     * Start a new scan
     */
    async startScan(target, type = 'standard') {
        if (!this.isValidTarget(target)) {
            throw new Error('Invalid or non-private target IP address');
        }

        const scanId = uuidv4();
        const scanInfo = {
            id: scanId,
            target,
            type,
            status: 'queued',
            progress: 0,
            startTime: new Date().toISOString(),
            result: null
        };

        this.scans.set(scanId, scanInfo);
        this.queue.push(scanId);
        this.processQueue();

        return scanId;
    }

    /**
     * Process the scan queue
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const scanId = this.queue.shift();
        const scan = this.scans.get(scanId);

        if (!scan) {
            this.isProcessing = false;
            return this.processQueue();
        }

        scan.status = 'processing';
        scan.progress = 10;

        const cmd = this.getScanParams(scan.type, scan.target);
        console.log(`Executing Nmap: ${cmd}`);

        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Nmap error: ${error.message}`);
                scan.status = 'failed';
                scan.error = error.message;
            } else {
                try {
                    scan.progress = 80;
                    const parsedData = await this.parseNmapXml(stdout);
                    scan.result = parsedData;
                    scan.status = 'completed';
                    scan.progress = 100;
                    scan.endTime = new Date().toISOString();
                    
                    this.saveToHistory(scan);
                } catch (parseError) {
                    console.error(`Parsing error: ${parseError.message}`);
                    scan.status = 'failed';
                    scan.error = 'Failed to parse scan results';
                }
            }

            this.isProcessing = false;
            this.processQueue();
        });
    }

    /**
     * Parse Nmap XML output
     */
    parseNmapXml(xml) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xml, (err, result) => {
                if (err) return reject(err);

                try {
                    const host = result.nmaprun.host ? result.nmaprun.host[0] : null;
                    if (!host) {
                        return resolve({ status: 'offline', ports: [] });
                    }

                    const ports = [];
                    if (host.ports && host.ports[0].port) {
                        host.ports[0].port.forEach(p => {
                            ports.push({
                                portid: p.$.portid,
                                protocol: p.$.protocol,
                                state: p.state[0].$.state,
                                service: p.service ? p.service[0].$.name : 'unknown',
                                product: p.service ? p.service[0].$.product : '',
                                version: p.service ? p.service[0].$.version : '',
                                script: p.script ? p.script.map(s => ({ id: s.$.id, output: s.$.output })) : []
                            });
                        });
                    }

                    const os = [];
                    if (host.os && host.os[0].osmatch) {
                        host.os[0].osmatch.forEach(m => {
                            os.push({
                                name: m.$.name,
                                accuracy: m.$.accuracy
                            });
                        });
                    }

                    const status = host.status ? host.status[0].$.state : 'unknown';
                    
                    resolve({
                        status,
                        ports,
                        os,
                        address: host.address ? host.address[0].$.addr : '',
                        hostname: host.hostnames && host.hostnames[0].hostname ? host.hostnames[0].hostname[0].$.name : ''
                    });
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Save scan result to history
     */
    saveToHistory(scan) {
        const ipDir = path.join(this.historyDir, scan.target.replace(/\./g, '_'));
        if (!fs.existsSync(ipDir)) {
            fs.mkdirSync(ipDir);
        }

        const filename = `${new Date().getTime()}_${scan.type}.json`;
        fs.writeFileSync(path.join(ipDir, filename), JSON.stringify(scan, null, 2));
    }

    /**
     * Get scan history for an IP
     */
    getHistory(target) {
        const ipDir = path.join(this.historyDir, target.replace(/\./g, '_'));
        if (!fs.existsSync(ipDir)) return [];

        const files = fs.readdirSync(ipDir);
        return files
            .map(f => JSON.parse(fs.readFileSync(path.join(ipDir, f))))
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    getScanStatus(scanId) {
        return this.scans.get(scanId);
    }
}

module.exports = new NmapManager();
