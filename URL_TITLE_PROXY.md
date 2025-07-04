# URL Title Proxy Configuration

The URL title autofill feature can be configured through Meteor settings. Create a `settings.json` file and pass it to Meteor using `--settings settings.json`.

## Configuration Options

```json
{
  "urlTitleProxy": {
    "enabled": true,
    "timeout": 10,
    "maxResponseSize": 1048576,
    "maxTitleLength": 200,
    "requireAuth": true,
    "allowedDomains": [],
    "blockPrivateNetworks": true
  }
}
```

### Settings Description

- **enabled** (boolean, default: true): Enable or disable the URL title proxy service
- **timeout** (number, default: 10): Maximum timeout for HTTP requests in seconds
- **maxResponseSize** (number, default: 1048576): Maximum response size in bytes (1MB)
- **maxTitleLength** (number, default: 200): Maximum length of extracted titles
- **requireAuth** (boolean, default: true): Require user authentication to use the service
- **allowedDomains** (array, default: []): List of allowed domains. Empty array allows all external domains
- **blockPrivateNetworks** (boolean, default: true): Block access to private/internal IP ranges

## Security Features

### SSRF Protection
- Blocks localhost and loopback addresses (`127.0.0.1`, `::1`, `localhost`)
- Prevents access to private IP ranges (`10.x`, `192.168.x`, `172.16-31.x`)
- Blocks local domains (`.local`, `.localhost`)
- Only allows HTTP/HTTPS protocols

### Request Safety
- Configurable timeout prevents hanging requests
- Configurable response size limit prevents memory exhaustion
- Configurable title length limit for reasonable display
- Proper User-Agent identification
- Authentication requirement by default

### Domain Restrictions
- Optional domain allowlist for additional security
- Configurable private network blocking

## Example Configurations

### Development (Permissive)
```json
{
  "urlTitleProxy": {
    "enabled": true,
    "requireAuth": false,
    "allowedDomains": [],
    "blockPrivateNetworks": true
  }
}
```

### Production (Restrictive)
```json
{
  "urlTitleProxy": {
    "enabled": true,
    "requireAuth": true,
    "allowedDomains": ["github.com", "stackoverflow.com", "docs.company.com"],
    "blockPrivateNetworks": true,
    "timeout": 5
  }
}
```

### Disabled
```json
{
  "urlTitleProxy": {
    "enabled": false
  }
}
```