# TimeHarbor Browser Extension API

This document describes the API endpoints that the TimeHarbor server needs to implement to support the browser extension.

## Authentication

All API endpoints require authentication using Bearer tokens:

```
Authorization: Bearer <token>
```

## Endpoints

### POST /api/auth/login

Authenticate user and receive access token.

**Request:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "12345",
    "username": "user@example.com",
    "name": "John Doe"
  },
  "expiresAt": "2025-09-04T18:30:00Z"
}
```

### POST /api/auth/refresh

Refresh authentication token.

**Request Headers:**
```
Authorization: Bearer <current_token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-09-04T18:30:00Z"
}
```

### GET /api/auth/validate

Validate current authentication token.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "12345",
    "username": "user@example.com"
  }
}
```

### POST /api/captures

Upload a new screenshot capture.

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>

screenshot: <image_file>
metadata: {
  "id": "capture_20250904_103045_001",
  "timestamp": "2025-09-04T10:30:45Z",
  "url": "https://example.com/article",
  "title": "Interesting Article Title",
  "favicon": "data:image/png;base64,...",
  "userAgent": "Mozilla/5.0...",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "tags": ["work", "research"]
}
```

**Response:**
```json
{
  "id": "capture_12345",
  "url": "https://timeharbor.com/captures/capture_12345",
  "timestamp": "2025-09-04T10:30:45Z",
  "status": "uploaded"
}
```

### GET /api/captures

Get user's captures with pagination.

**Request:**
```
GET /api/captures?page=1&limit=50&sort=timestamp&order=desc
Authorization: Bearer <token>
```

**Response:**
```json
{
  "captures": [
    {
      "id": "capture_12345",
      "timestamp": "2025-09-04T10:30:45Z",
      "url": "https://example.com/article",
      "title": "Interesting Article Title",
      "screenshotUrl": "https://timeharbor.com/captures/capture_12345/screenshot.png",
      "metadata": {
        "viewport": { "width": 1920, "height": 1080 },
        "tags": ["work", "research"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### GET /api/captures/:id

Get specific capture details.

**Request:**
```
GET /api/captures/capture_12345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "capture_12345",
  "timestamp": "2025-09-04T10:30:45Z",
  "url": "https://example.com/article",
  "title": "Interesting Article Title",
  "screenshotUrl": "https://timeharbor.com/captures/capture_12345/screenshot.png",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "viewport": { "width": 1920, "height": 1080 },
    "tags": ["work", "research"]
  }
}
```

### PATCH /api/captures/:id

Update capture metadata.

**Request:**
```json
{
  "title": "Updated Title",
  "tags": ["work", "updated"]
}
```

**Response:**
```json
{
  "id": "capture_12345",
  "timestamp": "2025-09-04T10:30:45Z",
  "url": "https://example.com/article",
  "title": "Updated Title",
  "screenshotUrl": "https://timeharbor.com/captures/capture_12345/screenshot.png",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "viewport": { "width": 1920, "height": 1080 },
    "tags": ["work", "updated"]
  }
}
```

### DELETE /api/captures/:id

Delete a capture.

**Request:**
```
DELETE /api/captures/capture_12345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Capture deleted successfully"
}
```

### GET /api/health

Check server health (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-04T10:30:45Z",
  "version": "1.0.0"
}
```

### GET /api/config

Get server configuration.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "maxUploadSize": 10485760,
  "supportedImageFormats": ["png", "jpeg"],
  "retentionPeriod": 365,
  "features": {
    "tagging": true,
    "sharing": true,
    "export": true
  }
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "screenshot",
      "issue": "File too large"
    }
  }
}
```

### Error Codes

- `AUTHENTICATION_REQUIRED` (401)
- `AUTHENTICATION_FAILED` (401)
- `TOKEN_EXPIRED` (401)
- `ACCESS_DENIED` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `FILE_TOO_LARGE` (413)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

## Rate Limiting

- **Authentication endpoints:** 5 requests per minute
- **Upload endpoints:** 10 uploads per minute
- **Get endpoints:** 100 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1630000000
```

## File Upload Specifications

### Screenshot Requirements

- **Max file size:** 10MB
- **Supported formats:** PNG, JPEG
- **Recommended dimensions:** Up to 4K (3840x2160)
- **Compression:** Automatic server-side optimization

### Metadata Requirements

- **Required fields:** `id`, `timestamp`, `url`, `title`
- **Optional fields:** `favicon`, `userAgent`, `viewport`, `tags`
- **Max metadata size:** 1KB JSON

## Implementation Notes

### For Meteor.js TimeHarbor Server

1. **File Storage:** Use GridFS or cloud storage (AWS S3, CloudFlare R2)
2. **Authentication:** Integrate with existing Meteor accounts system
3. **Database:** Store metadata in MongoDB collections
4. **API Routes:** Use Iron Router or newer routing solution
5. **CORS:** Enable for browser extension domains

### Example Meteor Method

```javascript
Meteor.methods({
  'captures.upload': function(screenshotData, metadata) {
    // Validate user authentication
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    
    // Validate and process screenshot
    const captureId = Captures.insert({
      userId: this.userId,
      timestamp: new Date(metadata.timestamp),
      url: metadata.url,
      title: metadata.title,
      metadata: metadata,
      screenshotUrl: uploadToStorage(screenshotData)
    });
    
    return {
      id: captureId,
      url: `/captures/${captureId}`,
      status: 'uploaded'
    };
  }
});
```

## Security Considerations

1. **Input Validation:** Sanitize all metadata fields
2. **File Validation:** Verify image file types and sizes
3. **Rate Limiting:** Implement per-user upload limits
4. **Storage Security:** Use secure file storage with access controls
5. **HTTPS Only:** All API endpoints must use HTTPS
6. **Token Security:** Use secure token generation and validation