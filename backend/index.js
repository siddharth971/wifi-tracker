require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { scanNetwork } = require('./scanner');
const nmapManager = require('./nmapManager');

const app = express();
const port = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: process.env.CACHE_DURATION || 10 });

app.use(cors());
app.use(express.json());

// Consolidated scan endpoint to avoid multiple scans
app.get('/api/scan-results', async (req, res) => {
    try {
        let devices = cache.get('networkScan');
        let source = 'cache';

        if (!devices) {
            console.log(`[Backend] Request received: GET /api/scan-results from source: ${req.ip}`);
            devices = await scanNetwork();
            cache.set('networkScan', devices);
            source = 'scan';
        } else {
            console.log(`[Backend] Returning cached results for /api/scan-results`);
        }

        const stats = {
            total: devices.length,
            online: devices.filter(d => d.status === 'Online').length,
            offline: 0,
            unknown: devices.filter(d => d.vendor === 'Unknown Vendor' || d.vendor === 'Rate Limited').length,
            types: {},
            vendors: {}
        };

        devices.forEach(d => {
            stats.types[d.type] = (stats.types[d.type] || 0) + 1;
            stats.vendors[d.vendor] = (stats.vendors[d.vendor] || 0) + 1;
        });

        res.json({
            success: true,
            source,
            timestamp: new Date().toISOString(),
            devices,
            stats
        });
    } catch (error) {
        console.error('Scan results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch network data',
            error: error.message
        });
    }
});

// Main scan endpoint (kept for backward compatibility)
app.get('/api/scan', async (req, res) => {
    try {
        const cachedResults = cache.get('networkScan');
        if (cachedResults) {
            return res.json({
                success: true,
                source: 'cache',
                timestamp: new Date().toISOString(),
                devices: cachedResults
            });
        }

        console.log('Starting network scan...');
        const devices = await scanNetwork();
        cache.set('networkScan', devices);

        res.json({
            success: true,
            source: 'scan',
            timestamp: new Date().toISOString(),
            devices: devices
        });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to scan network',
            error: error.message
        });
    }
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        let devices = cache.get('networkScan');
        if (!devices) {
            devices = await scanNetwork();
            cache.set('networkScan', devices);
        }

        const stats = {
            total: devices.length,
            online: devices.filter(d => d.status === 'Online').length,
            offline: 0,
            unknown: devices.filter(d => d.vendor === 'Unknown Vendor' || d.vendor === 'Rate Limited').length,
            types: {},
            vendors: {}
        };

        devices.forEach(d => {
            stats.types[d.type] = (stats.types[d.type] || 0) + 1;
            stats.vendors[d.vendor] = (stats.vendors[d.vendor] || 0) + 1;
        });

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Nmap Integration Routes ---

// Start a new Nmap scan
app.post('/api/nmap/scan', async (req, res) => {
    try {
        const { target, type } = req.body;
        if (!target) {
            return res.status(400).json({ success: false, message: 'Target IP is required' });
        }

        const scanId = await nmapManager.startScan(target, type || 'standard');
        res.json({
            success: true,
            scanId,
            message: `Scan for ${target} queued successfully`
        });
    } catch (error) {
        console.error('Start nmap scan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get status and results of a scan
app.get('/api/nmap/status/:scanId', (req, res) => {
    const { scanId } = req.params;
    const scan = nmapManager.getScanStatus(scanId);

    if (!scan) {
        return res.status(404).json({ success: false, message: 'Scan not found' });
    }

    res.json({
        success: true,
        scan
    });
});

// Get scan history for a specific IP
app.get('/api/nmap/history/:ip', (req, res) => {
    try {
        const { ip } = req.params;
        const history = nmapManager.getHistory(ip);
        res.json({
            success: true,
            history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(port, () => {
    console.log(`WiFi Tracker Backend listening at http://localhost:${port}`);
    console.log(`Configured range: ${process.env.NETWORK_RANGE}`);
});
