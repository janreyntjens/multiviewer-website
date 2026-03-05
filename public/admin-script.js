let adminPassword = null;
const geoCache = {}; // Cache geolocation results

function getSoftwareLabel(softwareKey) {
    return softwareKey === 'multiviewer' ? 'MultiViewer' : 'LED Logger';
}

function isPrivateOrLocalIp(ip) {
    if (!ip) {
        return true;
    }

    const normalizedIp = ip.toString().trim().toLowerCase();
    return (
        normalizedIp === '127.0.0.1' ||
        normalizedIp === 'localhost' ||
        normalizedIp === '::1' ||
        normalizedIp.startsWith('10.') ||
        /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(normalizedIp) ||
        normalizedIp.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalizedIp) ||
        normalizedIp.startsWith('169.254.') ||
        normalizedIp.startsWith('fc') ||
        normalizedIp.startsWith('fd') ||
        normalizedIp.startsWith('fe80:')
    );
}

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
    // Private and localhost IPs are not geolocatable via public IP services
    if (isPrivateOrLocalIp(ip)) {
        return 'Local Network / Private IP';
    }
    
    if (geoCache[ip]) {
        return geoCache[ip];
    }
    
    try {
        const ipApiResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        const ipApiData = await ipApiResponse.json();

        if (ipApiData && ipApiData.country_name) {
            const location = `${ipApiData.country_name} / ${ipApiData.city || 'N/A'}`;
            geoCache[ip] = location;
            return location;
        }

        const fallbackResponse = await fetch(`https://ipwho.is/${ip}`);
        const fallbackData = await fallbackResponse.json();

        if (fallbackData && fallbackData.success && fallbackData.country) {
            const fallbackLocation = `${fallbackData.country} / ${fallbackData.city || 'N/A'}`;
            geoCache[ip] = fallbackLocation;
            return fallbackLocation;
        }

        geoCache[ip] = 'Unknown (provider unavailable)';
        return 'Unknown (provider unavailable)';
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
            const multiviewerData = multiviewerHistory.map((item, index) => ({
                ...item,
                software: 'MultiViewer',
                softwareKey: 'multiviewer',
                historyIndex: index
            }));
            allDownloads = allDownloads.concat(multiviewerData);
        }
        
        if (ledloggerResponse.ok) {
            const ledloggerHistory = await ledloggerResponse.json();
            const ledloggerData = ledloggerHistory.map((item, index) => ({
                ...item,
                software: 'LED Logger',
                softwareKey: 'ledlogger',
                historyIndex: index
            }));
            allDownloads = allDownloads.concat(ledloggerData);
        }
        
        // Sort by timestamp descending (newest first)
        allDownloads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Take last 20
        allDownloads = allDownloads.slice(0, 20);
        
        if (allDownloads.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No downloads yet</td></tr>';
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
                    <td>
                        <button class="delete-log-btn" onclick="deleteHistoryItem('${download.softwareKey}', ${download.historyIndex})">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }
        
        historyBody.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Delete one history item
async function deleteHistoryItem(softwareKey, index) {
    const softwareLabel = getSoftwareLabel(softwareKey);
    if (!confirm(`Delete this ${softwareLabel} download log?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/history/${softwareKey}/${index}`, {
            method: 'DELETE',
            headers: {
                'x-admin-password': adminPassword
            }
        });

        if (response.status === 403) {
            alert('Incorrect password');
            logout();
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error || 'Could not delete log');
            return;
        }

        loadStats();
        loadHistory();
    } catch (error) {
        console.error('Error deleting history item:', error);
        alert('Error deleting log');
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
