/**
 * TimeHarbor API Client
 * Handles communication with TimeHarbor server
 */

class TimeHarborAPIClient {
  constructor(baseUrl = 'https://localhost:3000', authToken = null) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = authToken;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Set base URL for API
   */
  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  /**
   * Upload screenshot to TimeHarbor server
   */
  async uploadCapture(screenshot, metadata) {
    const formData = new FormData();
    
    // Convert screenshot to blob if it's base64
    let screenshotBlob;
    if (typeof screenshot === 'string' && screenshot.startsWith('data:')) {
      screenshotBlob = this.base64ToBlob(screenshot, 'image/png');
    } else if (screenshot instanceof Blob) {
      screenshotBlob = screenshot;
    } else {
      throw new Error('Invalid screenshot format');
    }
    
    formData.append('screenshot', screenshotBlob, `${metadata.id}.png`);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/captures`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      url: result.url || `${this.baseUrl}/captures/${result.id}`,
      timestamp: result.timestamp || new Date().toISOString()
    };
  }

  /**
   * Authenticate user with username/password
   */
  async authenticate(username, password) {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    this.authToken = result.token;
    
    return {
      token: result.token,
      user: result.user,
      expiresAt: result.expiresAt
    };
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    if (!this.authToken) {
      throw new Error('No auth token available to refresh');
    }

    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    this.authToken = result.token;
    
    return {
      token: result.token,
      expiresAt: result.expiresAt
    };
  }

  /**
   * Get user captures from server
   */
  async getCaptures(page = 1, limit = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/captures?${params}`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch captures: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete capture from server
   */
  async deleteCapture(captureId) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/captures/${captureId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete capture: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Update capture metadata
   */
  async updateCapture(captureId, metadata) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/captures/${captureId}`,
      {
        method: 'PATCH',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update capture: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check server health/connectivity
   */
  async checkHealth() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/health`, {
        method: 'GET'
      });

      return {
        online: response.ok,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        online: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate authentication token
   */
  async validateToken() {
    if (!this.authToken) {
      return { valid: false, error: 'No token provided' };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/validate`, {
        headers: this.getAuthHeaders()
      });

      return {
        valid: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk upload multiple captures
   */
  async bulkUpload(captures) {
    const results = [];
    
    for (const capture of captures) {
      try {
        const result = await this.uploadCapture(capture.screenshot, capture.metadata);
        results.push({
          id: capture.metadata.id,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          id: capture.metadata.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get server configuration/settings
   */
  async getServerConfig() {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/config`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get server config: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Private helper methods
   */

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Fetch with timeout
   */
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Convert base64 to blob
   */
  base64ToBlob(base64, contentType) {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  /**
   * Test connection to server
   */
  async testConnection() {
    try {
      const health = await this.checkHealth();
      
      if (!health.online) {
        return {
          success: false,
          error: 'Server is not responding',
          details: health
        };
      }

      // Test authentication if token is available
      if (this.authToken) {
        const tokenValidation = await this.validateToken();
        if (!tokenValidation.valid) {
          return {
            success: false,
            error: 'Authentication failed',
            details: tokenValidation
          };
        }
      }

      return {
        success: true,
        message: 'Connection successful',
        server: this.baseUrl,
        authenticated: !!this.authToken
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        server: this.baseUrl
      };
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.TimeHarborAPIClient = TimeHarborAPIClient;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeHarborAPIClient;
}