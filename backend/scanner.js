const { exec } = require('child_process');
const axios = require('axios');
const NodeCache = require('node-cache');

const vendorCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

/**
 * Normalizes MAC address format
 */
const normalizeMac = (mac) => {
    return mac.toUpperCase().replace(/-/g, ':');
};

/**
 * Fetches vendor information for a MAC address
 */
const getVendor = async (mac) => {
    const prefix = mac.substring(0, 8).toUpperCase().replace(/-/g, ':').substring(0, 8);
    const cached = vendorCache.get(prefix);
    if (cached) return cached;

    try {
        // We use a slightly different approach to avoid hitting the rate limit too hard
        // We'll wait a random bit or just skip if it fails
        const response = await axios.get(`https://api.macvendors.com/${prefix}`, { timeout: 3000 });
        const vendor = response.data;
        vendorCache.set(prefix, vendor);
        return vendor;
    } catch (error) {
        // If we hit a rate limit (429), we just return Unknown but don't cache it as Unknown
        if (error.response && error.response.status === 429) {
            return 'Rate Limited';
        }
        return 'Unknown Vendor';
    }
};

/**
 * Determines device type based on vendor or other hints
 */
const getDeviceType = (vendor, hostname) => {
    const v = (vendor || '').toLowerCase();
    const h = (hostname || '').toLowerCase();

    if (v.includes('apple') || v.includes('samsung') || v.includes('google') || v.includes('huawei') || v.includes('motorola')) return 'Mobile';
    if (v.includes('tp-link') || v.includes('netgear') || v.includes('cisco') || v.includes('d-link') || v.includes('mikrotik') || v.includes('ubiquiti')) return 'Router';
    if (v.includes('sony') || v.includes('lg') || v.includes('vizio') || v.includes('roku') || v.includes('samsung tv')) return 'Smart TV';
    if (v.includes('raspberry') || v.includes('arduino') || v.includes('espressif') || v.includes('tuya') || v.includes('shelly')) return 'IoT Device';
    if (v.includes('dell') || v.includes('hp') || v.includes('lenovo') || v.includes('asus') || v.includes('intel')) return 'Computer';
    
    return 'Unknown';
};

/**
 * Scans the network using arp -a
 */
const scanNetwork = () => {
    return new Promise((resolve, reject) => {
        exec('arp -a', async (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }

            const deviceMap = new Map();
            const lines = stdout.split('\n');
            const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
            const macRegex = /([0-9a-f]{2}-[0-9a-f]{2}-[0-9a-f]{2}-[0-9a-f]{2}-[0-9a-f]{2}-[0-9a-f]{2})/i;

            for (const line of lines) {
                const ipMatch = line.match(ipRegex);
                const macMatch = line.match(macRegex);

                if (ipMatch && macMatch) {
                    const ip = ipMatch[1];
                    const mac = normalizeMac(macMatch[1]);
                    
                    // Skip broadcast and multicast addresses
                    if (ip.endsWith('.255') || ip.startsWith('224.') || ip.startsWith('239.') || mac === 'FF:FF:FF:FF:FF:FF' || mac === '00:00:00:00:00:00') continue;

                    // Use Map to avoid duplicates for the same IP
                    deviceMap.set(ip, { ip, mac });
                }
            }

            const devices = Array.from(deviceMap.values());
            
            // Enrich devices one by one or in small batches to avoid rate limits and high CPU
            const enrichedDevices = [];
            for (const device of devices) {
                console.log(`[Scanner] Processing device ${enrichedDevices.length + 1}/${devices.length}: ${device.ip}`);
                try {
                    const vendor = await getVendor(device.mac);
                    const type = getDeviceType(vendor, '');
                    enrichedDevices.push({
                        ...device,
                        vendor,
                        type,
                        status: 'Online',
                        lastSeen: new Date().toISOString()
                    });
                    
                    // Small delay to be kind to the API and CPU
                    if (devices.length > 5) {
                        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
                    }
                } catch (err) {
                    console.warn(`[Scanner] Failed to enrich device ${device.ip}:`, err.message);
                    enrichedDevices.push({
                        ...device,
                        vendor: 'Unknown Vendor',
                        type: 'Unknown',
                        status: 'Online',
                        lastSeen: new Date().toISOString()
                    });
                }
            }

            resolve(enrichedDevices);
        });
    });
};

module.exports = { scanNetwork };
