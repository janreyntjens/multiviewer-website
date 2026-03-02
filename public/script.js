// Download button and counter logic
// Load downloads count on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
});

// Handle download for specific software
async function downloadSoftware(softwareId) {
  try {
    // Send download event to server
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

