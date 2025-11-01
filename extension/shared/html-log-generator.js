/**
 * TimeHarbor HTML Activity Log Generator
 * Creates and maintains the browsable HTML activity log
 */

class HTMLLogGenerator {
  constructor(storagePath = '~/Documents/TimeHarbor/') {
    this.storagePath = storagePath;
    this.logPath = `${storagePath}/logs/activity_log.html`;
    this.dataPath = `${storagePath}/logs/activity_data.js`;
    this.activityData = [];
  }

  /**
   * Initialize or load existing activity data
   */
  async initialize() {
    try {
      await this.loadActivityData();
    } catch (error) {
      console.log('Creating new activity log');
      this.activityData = [];
      await this.generateHTMLLog();
    }
  }

  /**
   * Add new capture entry to activity log
   */
  async addEntry(captureEntry) {
    const entry = {
      id: captureEntry.id,
      timestamp: captureEntry.timestamp,
      url: captureEntry.url,
      title: captureEntry.title,
      favicon: captureEntry.favicon,
      screenshotPath: this.makeRelativePath(captureEntry.screenshotPath),
      mode: captureEntry.mode,
      status: captureEntry.status,
      metadata: {
        viewport: captureEntry.viewport,
        userAgent: captureEntry.userAgent,
        tags: captureEntry.tags || []
      }
    };

    // Add to beginning of array (newest first)
    this.activityData.unshift(entry);

    // Limit to recent entries (configurable)
    const maxEntries = 1000;
    if (this.activityData.length > maxEntries) {
      this.activityData = this.activityData.slice(0, maxEntries);
    }

    await this.saveActivityData();
    await this.generateHTMLLog();
  }

  /**
   * Generate the complete HTML activity log
   */
  async generateHTMLLog() {
    const html = this.createHTMLTemplate();
    
    // Write HTML file via native messaging
    return new Promise((resolve, reject) => {
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'writeFile',
        path: this.logPath,
        content: html,
        encoding: 'utf8'
      }, (response) => {
        if (response && response.success) {
          resolve(response.path);
        } else {
          reject(new Error('Failed to write HTML log'));
        }
      });
    });
  }

  /**
   * Create the HTML template with embedded data and styling
   */
  createHTMLTemplate() {
    const stats = this.calculateStats();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TimeHarbor Activity Log</title>
    <style>
        /* Modern, clean styling for timeline view */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }

        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .stats {
            display: flex;
            gap: 24px;
            font-size: 0.9rem;
            opacity: 0.9;
            flex-wrap: wrap;
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .controls {
            background: white;
            padding: 16px 24px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }

        .search-box {
            flex: 1;
            max-width: 400px;
            padding: 8px 16px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 14px;
        }

        .filter-buttons {
            display: flex;
            gap: 8px;
        }

        .filter-btn {
            padding: 6px 12px;
            border: 1px solid #cbd5e1;
            background: white;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .filter-btn:hover {
            background: #f1f5f9;
        }

        .filter-btn.active {
            background: #3498db;
            color: white;
            border-color: #3498db;
        }

        .timeline {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }

        .capture-entry {
            background: white;
            margin: 16px 0;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .capture-entry:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .entry-content {
            display: flex;
            align-items: flex-start;
            padding: 20px;
            gap: 20px;
        }

        .thumbnail-container {
            flex-shrink: 0;
            position: relative;
        }

        .thumbnail {
            width: 180px;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .thumbnail:hover {
            transform: scale(1.05);
        }

        .metadata {
            flex: 1;
            min-width: 0;
        }

        .entry-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .favicon {
            width: 16px;
            height: 16px;
            border-radius: 2px;
        }

        .title {
            font-weight: 600;
            font-size: 1.1rem;
            color: #1e293b;
            text-decoration: none;
            flex: 1;
        }

        .title:hover {
            color: #3498db;
        }

        .url {
            color: #64748b;
            font-size: 0.9rem;
            text-decoration: none;
            word-break: break-all;
            margin-bottom: 8px;
            display: block;
        }

        .timestamp {
            color: #94a3b8;
            font-size: 0.85rem;
            margin-bottom: 12px;
        }

        .status-indicators {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-local {
            background: #dcfce7;
            color: #166534;
        }

        .status-synced {
            background: #dbeafe;
            color: #1e40af;
        }

        .status-pending {
            background: #fed7aa;
            color: #c2410c;
        }

        .status-failed {
            background: #fecaca;
            color: #dc2626;
        }

        .mode-indicator {
            font-size: 0.8rem;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #64748b;
        }

        .empty-state h3 {
            font-size: 1.2rem;
            margin-bottom: 8px;
            color: #475569;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .modal.active {
            display: flex;
        }

        .modal img {
            max-width: 90vw;
            max-height: 90vh;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        @media (max-width: 768px) {
            .entry-content {
                flex-direction: column;
                gap: 16px;
            }

            .thumbnail {
                width: 100%;
                height: 200px;
            }

            .stats {
                font-size: 0.8rem;
            }

            .controls {
                flex-direction: column;
                align-items: stretch;
            }

            .search-box {
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏰 TimeHarbor Activity Log</h1>
        <div class="stats">
            <div class="stat-item">
                <span>📊 Total Captures:</span>
                <strong id="total-count">${stats.total}</strong>
            </div>
            <div class="stat-item">
                <span>💾 Local:</span>
                <strong id="local-count">${stats.local}</strong>
            </div>
            <div class="stat-item">
                <span>☁️ Synced:</span>
                <strong id="synced-count">${stats.synced}</strong>
            </div>
            <div class="stat-item">
                <span>⏳ Pending:</span>
                <strong id="pending-count">${stats.pending}</strong>
            </div>
        </div>
    </div>

    <div class="controls">
        <input type="text" class="search-box" placeholder="Search by URL, title, or date..." id="searchInput">
        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="local">Local</button>
            <button class="filter-btn" data-filter="server">Server</button>
            <button class="filter-btn" data-filter="both">Both</button>
        </div>
    </div>

    <div class="timeline" id="timeline">
        ${this.generateEntriesHTML()}
    </div>

    <div class="modal" id="imageModal">
        <img id="modalImage" src="" alt="Full size screenshot">
    </div>

    <script>
        // Activity data
        const activityData = ${JSON.stringify(this.activityData, null, 2)};

        // Search and filter functionality
        let currentFilter = 'all';
        let searchTerm = '';

        function renderEntries() {
            const timeline = document.getElementById('timeline');
            const filteredData = activityData.filter(entry => {
                const matchesFilter = currentFilter === 'all' || entry.mode === currentFilter;
                const matchesSearch = !searchTerm || 
                    entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    entry.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    entry.timestamp.includes(searchTerm);
                return matchesFilter && matchesSearch;
            });

            if (filteredData.length === 0) {
                timeline.innerHTML = \`
                    <div class="empty-state">
                        <h3>No captures found</h3>
                        <p>Try adjusting your search or filter criteria.</p>
                    </div>
                \`;
                return;
            }

            timeline.innerHTML = filteredData.map(entry => \`
                <div class="capture-entry">
                    <div class="entry-content">
                        <div class="thumbnail-container">
                            <img class="thumbnail" 
                                 src="\${entry.screenshotPath}" 
                                 alt="Screenshot"
                                 onclick="openModal('\${entry.screenshotPath}')"
                                 onerror="this.style.display='none'">
                        </div>
                        <div class="metadata">
                            <div class="entry-header">
                                <img class="favicon" src="\${entry.favicon}" alt="" onerror="this.style.display='none'">
                                <a href="\${entry.url}" class="title" target="_blank">\${entry.title}</a>
                            </div>
                            <a href="\${entry.url}" class="url" target="_blank">\${entry.url}</a>
                            <div class="timestamp">\${new Date(entry.timestamp).toLocaleString()}</div>
                            <div class="status-indicators">
                                <span class="status-badge status-\${entry.status.local}">\${entry.status.local}</span>
                                \${entry.status.server !== 'n/a' ? \`<span class="status-badge status-\${entry.status.server}">\${entry.status.server}</span>\` : ''}
                            </div>
                            <div class="mode-indicator">
                                📱 Mode: \${entry.mode}
                            </div>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderEntries();
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                renderEntries();
            });
        });

        // Modal functionality
        function openModal(imageSrc) {
            document.getElementById('modalImage').src = imageSrc;
            document.getElementById('imageModal').classList.add('active');
        }

        document.getElementById('imageModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('imageModal').classList.remove('active');
            }
        });

        // Initialize
        renderEntries();
    </script>
</body>
</html>`;
  }

  /**
   * Generate HTML for entries (fallback if JavaScript is disabled)
   */
  generateEntriesHTML() {
    if (this.activityData.length === 0) {
      return `
        <div class="empty-state">
          <h3>No captures yet</h3>
          <p>Click the TimeHarbor toolbar button to capture your first screenshot!</p>
        </div>
      `;
    }

    return this.activityData.map(entry => `
      <div class="capture-entry">
        <div class="entry-content">
          <div class="thumbnail-container">
            <img class="thumbnail" src="${entry.screenshotPath}" alt="Screenshot">
          </div>
          <div class="metadata">
            <div class="entry-header">
              <img class="favicon" src="${entry.favicon}" alt="">
              <a href="${entry.url}" class="title" target="_blank">${entry.title}</a>
            </div>
            <a href="${entry.url}" class="url" target="_blank">${entry.url}</a>
            <div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
            <div class="status-indicators">
              <span class="status-badge status-${entry.status.local}">${entry.status.local}</span>
              ${entry.status.server !== 'n/a' ? `<span class="status-badge status-${entry.status.server}">${entry.status.server}</span>` : ''}
            </div>
            <div class="mode-indicator">📱 Mode: ${entry.mode}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Calculate statistics for the header
   */
  calculateStats() {
    const stats = {
      total: this.activityData.length,
      local: 0,
      synced: 0,
      pending: 0,
      failed: 0
    };

    this.activityData.forEach(entry => {
      if (entry.status.local === 'saved') stats.local++;
      if (entry.status.server === 'synced') stats.synced++;
      if (entry.status.server === 'pending') stats.pending++;
      if (entry.status.server === 'failed' || entry.status.local === 'failed') stats.failed++;
    });

    return stats;
  }

  /**
   * Load activity data from file
   */
  async loadActivityData() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'readFile',
        path: this.dataPath,
        encoding: 'utf8'
      }, (response) => {
        if (response && response.success) {
          try {
            // Extract JSON from JavaScript file
            const jsContent = response.content;
            const jsonMatch = jsContent.match(/const activityData = (\[.*\]);/s);
            if (jsonMatch) {
              this.activityData = JSON.parse(jsonMatch[1]);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Failed to load activity data'));
        }
      });
    });
  }

  /**
   * Save activity data to JavaScript file
   */
  async saveActivityData() {
    const jsContent = `// TimeHarbor Activity Data
// Generated on ${new Date().toISOString()}
const activityData = ${JSON.stringify(this.activityData, null, 2)};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = activityData;
}`;

    return new Promise((resolve, reject) => {
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'writeFile',
        path: this.dataPath,
        content: jsContent,
        encoding: 'utf8'
      }, (response) => {
        if (response && response.success) {
          resolve();
        } else {
          reject(new Error('Failed to save activity data'));
        }
      });
    });
  }

  /**
   * Convert absolute path to relative path for HTML links
   */
  makeRelativePath(absolutePath) {
    if (!absolutePath) return '';
    
    // Convert to relative path from the logs directory
    const basePath = this.storagePath;
    if (absolutePath.startsWith(basePath)) {
      return '..' + absolutePath.substring(basePath.length);
    }
    return absolutePath;
  }

  /**
   * Archive old logs by month
   */
  async archiveOldLogs() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Archive entries older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const toArchive = this.activityData.filter(entry => 
      new Date(entry.timestamp) < threeMonthsAgo
    );
    
    if (toArchive.length > 0) {
      // Create archived log
      const archiveData = [...toArchive];
      const archivePath = `${this.storagePath}/logs/archived/activity_log_${currentMonth}.html`;
      
      // Generate archive HTML
      const originalData = this.activityData;
      this.activityData = archiveData;
      const archiveHTML = this.createHTMLTemplate();
      this.activityData = originalData;
      
      // Write archive file
      await new Promise((resolve, reject) => {
        chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
          action: 'writeFile',
          path: archivePath,
          content: archiveHTML,
          encoding: 'utf8'
        }, (response) => {
          if (response && response.success) {
            resolve();
          } else {
            reject(new Error('Failed to create archive'));
          }
        });
      });
      
      // Remove archived entries from current log
      this.activityData = this.activityData.filter(entry => 
        new Date(entry.timestamp) >= threeMonthsAgo
      );
      
      await this.saveActivityData();
      await this.generateHTMLLog();
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.HTMLLogGenerator = HTMLLogGenerator;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLLogGenerator;
}