// Download button and counter logic
const SOFTWARE_CONFIG = {
  multiviewer: {
    repo: 'janreyntjens/MULTIVIEWER-PRO',
    fallbackDownloadUrl: 'https://github.com/janreyntjens/MULTIVIEWER-PRO/releases/download/v1.0.5/MultiViewer_v1.0.5.exe',
    fallbackReadmeUrl: 'https://github.com/janreyntjens/MULTIVIEWER-PRO/releases/download/v1.0.5/README.html',
    versionElementId: 'multiviewer-version',
    readmeLinkElementId: 'multiviewer-readme-link'
  },
  ledlogger: {
    repo: '',
    fallbackDownloadUrl: '#',
    fallbackReadmeUrl: '#',
    versionElementId: 'ledlogger-version',
    readmeLinkElementId: ''
  }
};

const releaseCache = {};

// Load dynamic release info on page load
document.addEventListener('DOMContentLoaded', async () => {
  await hydrateSoftwareUi('multiviewer');
});

async function fetchLatestRelease(softwareId) {
  const software = SOFTWARE_CONFIG[softwareId];
  if (!software || !software.repo) {
    return null;
  }

  if (releaseCache[softwareId]) {
    return releaseCache[softwareId];
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${software.repo}/releases/latest`);
    if (!response.ok) {
      return null;
    }

    const release = await response.json();
    releaseCache[softwareId] = release;
    return release;
  } catch (error) {
    console.error(`Failed to fetch latest release for ${softwareId}:`, error);
    return null;
  }
}

function getDownloadUrlFromRelease(softwareId, release) {
  if (!release || !Array.isArray(release.assets)) {
    return SOFTWARE_CONFIG[softwareId].fallbackDownloadUrl;
  }

  const exeAsset = release.assets.find(asset =>
    typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.exe')
  );

  return exeAsset?.browser_download_url || SOFTWARE_CONFIG[softwareId].fallbackDownloadUrl;
}

function getReadmeUrlFromRelease(softwareId, release) {
  if (!release || !Array.isArray(release.assets)) {
    return SOFTWARE_CONFIG[softwareId].fallbackReadmeUrl;
  }

  const readmeAsset = release.assets.find(asset =>
    typeof asset.name === 'string' && asset.name.toLowerCase() === 'readme.html'
  );

  return readmeAsset?.browser_download_url || SOFTWARE_CONFIG[softwareId].fallbackReadmeUrl;
}

async function hydrateSoftwareUi(softwareId) {
  const software = SOFTWARE_CONFIG[softwareId];
  if (!software) {
    return;
  }

  const release = await fetchLatestRelease(softwareId);

  if (software.versionElementId) {
    const versionElement = document.getElementById(software.versionElementId);
    if (versionElement && release?.tag_name) {
      versionElement.textContent = release.tag_name;
    }
  }

  if (software.readmeLinkElementId) {
    const readmeLinkElement = document.getElementById(software.readmeLinkElementId);
    if (readmeLinkElement) {
      readmeLinkElement.href = getReadmeUrlFromRelease(softwareId, release);
    }
  }
}

// Handle download for specific software
async function downloadSoftware(softwareId) {
  try {
    const software = SOFTWARE_CONFIG[softwareId];
    if (!software) {
      return;
    }

    const release = await fetchLatestRelease(softwareId);
    const downloadUrl = getDownloadUrlFromRelease(softwareId, release);

    // Start the actual file download
    if (downloadUrl && downloadUrl !== '#') {
      window.location.href = downloadUrl;
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

