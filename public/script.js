// Download button and counter logic
// Load downloads count on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
});

// Handle download for specific software
async function downloadSoftware(softwareId) {
  try {
    // Define download URLs for each software
    const downloadUrls = {
      'multiviewer': 'https://github.com/janreyntjens/MULTIVIEWER-PRO/releases/download/v1.0.5/MultiViewer_v1.0.5.exe',
      'ledlogger': '#' // Update this later with LED Logger URL
    };

    // Start the actual file download
    if (downloadUrls[softwareId] && downloadUrls[softwareId] !== '#') {
      window.location.href = downloadUrls[softwareId];
    }

    // Send download event to server for tracking
    const response = await fetch(`/api/download/${softwareId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (data.success) {
      console.log(`${softwareId} download tracked!`);
    }
    
  } catch (error) {
    console.error('Error during download:', error);
  }
}

