# Google OAuth Setup Guide

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

## Step 2: Create a settings.json file

Create a file called `settings.json` in your project root with your credentials:

```json
{
  "google": {
    "clientId": "your_actual_client_id_here",
    "clientSecret": "your_actual_client_secret_here"
  }
}
```

## Step 3: Start your app with settings

Run your Meteor app with the settings file:

## Step 4: Get Your Credentials

After creating the OAuth client, you'll get:
- **Client ID**: A long string ending with `.apps.googleusercontent.com`
- **Client Secret**: A secret string

## Step 5: Configure Environment Variables

Create a `.env` file in your project root with:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

## Step 6: Install Environment Variables Package

```bash
meteor add dotenv
```

## Step 7: Test the Setup

1. Start your Meteor app: `meteor run`
2. Go to the login/signup page
3. Click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen

## Troubleshooting

### "Already registered the google OAuth service" Error
This means Google OAuth is already configured. You can:
1. Clear the MongoDB collection: `db.meteor_accounts_loginServiceConfiguration.remove({service: "google"})`
2. Restart your Meteor app

### "Service not configured" Error
This means the Google OAuth credentials are not properly set. Check:
1. Environment variables are set correctly
2. Google Cloud Console credentials are valid
3. Redirect URIs match your app URL

### "Invalid redirect_uri" Error
Make sure the redirect URI in Google Cloud Console exactly matches:
- Development: `http://localhost:3000/_oauth/google`
- Production: `https://yourdomain.com/_oauth/google`

## Security Notes

- Never commit your `.env` file to version control
- Use different OAuth credentials for development and production
- Regularly rotate your client secrets
- Monitor OAuth usage in Google Cloud Console

## Additional OAuth Providers

To add other OAuth providers (GitHub, Facebook, etc.), follow similar steps:

1. Add the provider package: `meteor add accounts-github`
2. Configure the service in `server/main.js`
3. Add login buttons to your templates
4. Handle the login events in your client code 