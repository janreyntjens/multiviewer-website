let adminPassword = null;
const geoCache = {}; // Cache geolocation results

// Login
function login() {
    const password = document.getElementById('passwordInput').value;
    
    if (!password) {
        alert('Please enter password');
        return;
    }

    adminPassword = password;
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    // Load stats immediately
    loadStats();
    loadHistory();
    
    // Refresh every 5 seconds
    setInterval(() => {
        loadStats();
        loadHistory();
    }, 5000);
}

// Logout
function logout() {
    adminPassword = null;
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('passwordInput').value = '';
}

// Get geolocation from IP
async function getGeoLocation(ip) {
    // Handle localhost IPs
    if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
        return 'Local / Testing';
    }
    
    if (geoCache[ip]) {
        return geoCache[ip];
    }
    
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        
        if (!data || !data.country_name) {
            geoCache[ip] = 'Unknown';
            return 'Unknown';
        }
        
        const location = `${data.country_name} / ${data.city || 'N/A'}`;
        geoCache[ip] = location;
        return location;
    } catch (error) {
        console.error('Geolocation error:', error);
        geoCache[ip] = 'Unable to locate';
        return 'Unable to locate';
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/admin/downloads', {
            headers: {
                'x-admin-password': adminPassword
            }
        });

        if (response.status === 403) {
            alert('Incorrect password');
            logout();
            return;
        }

        const softwareData = await response.json();
        
        // Generate stats HTML
        let statsHTML = '';
        for (const [key, software] of Object.entries(softwareData)) {
            const lastDownload = software.lastDownload 
                ? new Date(software.lastDownload).toLocaleString('en-US')
                : 'Never';
            
            statsHTML += `
                <div class="stat-card">
                    <p class="stat-label">${software.name}</p>
                    <p class="stat-large">${software.count}</p>
                    <p class="stat-time">Last: ${lastDownload}</p>
                </div>
            `;
        }
        
        document.getElementById('statsContainer').innerHTML = statsHTML;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load download history
async function loadHistory() {
    try {
        // Fetch history for both softwares
        const multiviewerResponse = await fetch('/api/admin/history/multiviewer', {
            headers: {
                'x-admin-password': adminPassword
            }
        });
        
        const ledloggerResponse = await fetch('/api/admin/history/ledlogger', {
            headers: {
                'x-admin-password': adminPassword
            }
        });
        
        let historyBody = document.getElementById('historyBody');
        let allDownloads = [];
        
        if (multiviewerResponse.ok) {
            const multiviewerHistory = await multiviewerResponse.json();
            const multiviewerData = multiviewerHistory.map(item => ({
                ...item,
                software: 'MultiViewer'
            }));
            allDownloads = allDownloads.concat(multiviewerData);
        }
        
        if (ledloggerResponse.ok) {
            const ledloggerHistory = await ledloggerResponse.json();
            const ledloggerData = ledloggerHistory.map(item => ({
                ...item,
                software: 'LED Logger'
            }));
            allDownloads = allDownloads.concat(ledloggerData);
        }
        
        // Sort by timestamp descending (newest first)
        allDownloads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Take last 20
        allDownloads = allDownloads.slice(0, 20);
        
        if (allDownloads.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No downloads yet</td></tr>';
            return;
        }
        
        // Build table rows with geolocation
        let html = '';
        for (const download of allDownloads) {
            const date = new Date(download.timestamp).toLocaleString('en-US');
            const location = await getGeoLocation(download.ip);
            
            html += `
                <tr>
                    <td>${download.software}</td>
                    <td>${download.ip}</td>
                    <td>${location}</td>
                    <td>${date}</td>
                </tr>
            `;
        }
        
        historyBody.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Reset counter
async function resetCounter() {
    if (!confirm('Are you sure? This cannot be undone!')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/reset', {
            method: 'POST',
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const data = await response.json();
        
        if (data.success) {
            alert('All counters reset to 0');
            loadStats();
            loadHistory();
        }
    } catch (error) {
        console.error('Error resetting:', error);
        alert('Error resetting');
    }
}

// Enter key in password field
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
});
