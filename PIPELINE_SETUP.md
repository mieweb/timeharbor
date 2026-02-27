# CI/CD Pipeline Setup Guide

Congratulations! Your advanced CI/CD pipeline has been generated. To make it work, you need to configure a few things in your GitHub repository.

## 1. GitHub Secrets & Variables

Go to your repository on GitHub, navigate to **Settings > Secrets and variables > Actions**.

### Variables (Non-sensitive)

*   `DEPLOY_HOST`: The IP address or hostname of your server.
*   `DEPLOY_PORT`: The SSH port (default is 22).


*   `SERVER_URL`: The URL of your production server (e.g., `https://api.myapp.com`).



*   `IOS_BUNDLE_ID`: Your iOS bundle ID (e.g., `com.company.app`).
*   `IOS_SCHEME_NAME`: Your Xcode scheme name (usually your app name).


### Secrets (Sensitive)

### Server Deployment Secrets

To allow GitHub Actions to connect to your server securely, you need to generate an SSH key pair.

**1. Create the SSH Key Pair (`DEPLOY_SSH_KEY`):**
*   Open your terminal and generate a new SSH key specifically for GitHub Actions (do not use a passphrase):
    ```bash
    ssh-keygen -t ed25519 -C "github-actions@deploy" -f ~/.ssh/github_actions_deploy -N ""
    ```
*   This creates two files: `github_actions_deploy` (private key) and `github_actions_deploy.pub` (public key).
*   **Copy the Private Key:**
    *   **Mac:** `pbcopy < ~/.ssh/github_actions_deploy`
    *   **Linux:** `cat ~/.ssh/github_actions_deploy | xclip -selection clipboard`
*   Go to your GitHub repository > **Settings > Secrets and variables > Actions**, and paste the private key into a new secret named `DEPLOY_SSH_KEY`.

**2. Authorize the Key on Your Server:**
*   You must place the *public* key on your target server so it accepts the connection.
*   **Copy the Public Key:**
    *   **Mac:** `pbcopy < ~/.ssh/github_actions_deploy.pub`
    *   **Linux:** `cat ~/.ssh/github_actions_deploy.pub | xclip -selection clipboard`
*   SSH into your `DEPLOY_HOST` server using your normal credentials.
*   Open the authorized keys file: 
    ```bash
    nano ~/.ssh/authorized_keys
    ```
*   Paste the public key on a new line at the end of the file, save, and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).
*   Ensure the permissions are correct on the server:
    ```bash
    chmod 600 ~/.ssh/authorized_keys
    ```

**3. Set the Deploy User (`DEPLOY_USER`):**
*   `DEPLOY_USER`: The SSH username you use on the server (e.g., `ubuntu`, `root`). Add this as a secret in GitHub.





### iOS Setup & Secrets

To publish to TestFlight or the App Store, you need an Apple Developer account ($99/yr) and several certificates.

**1. Create a Distribution Certificate (`IOS_DIST_CERT_P12_BASE64`):**
*   Log in to the [Apple Developer Portal](https://developer.apple.com/account).
*   Go to **Certificates, Identifiers & Profiles > Certificates** and click the `+` button.
*   Select **Apple Distribution** and upload a Certificate Signing Request (CSR) generated from your Mac's Keychain Access app.
*   Download the `.cer` file and double-click it to install it into your Mac's Keychain.
*   Open **Keychain Access**, find the certificate (it will say "Apple Distribution: [Your Name/Company]"), right-click it, and select **Export**.
*   Save it as a `.p12` file and specify a strong password. Add this password as the `IOS_DIST_CERT_PASSWORD` secret.
*   Base64 encode the `.p12` file (Mac: `base64 -i file.p12 | pbcopy`) and paste it into `IOS_DIST_CERT_P12_BASE64`.

**2. Create an App ID and Provisioning Profile (`IOS_PROVISIONING_PROFILE_BASE64`):**
*   In the Developer Portal, go to **Identifiers** and create an App ID matching your `IOS_BUNDLE_ID` (e.g., `com.company.app`).
*   Go to **Profiles**, click `+`, select **App Store** (under Distribution), select your App ID, and select the Distribution Certificate you just created.
*   Download the `.mobileprovision` file.
*   Base64 encode it (Mac: `base64 -i file.mobileprovision | pbcopy`) and paste it into `IOS_PROVISIONING_PROFILE_BASE64`.

**3. Generate an App Store Connect API Key (`APPLE_API_KEY_P8_BASE64`):**
*   Log in to [App Store Connect](https://appstoreconnect.apple.com/).
*   Go to **Users and Access > Integrations > App Store Connect API**.
*   Click the `+` button to generate a new key. Give it an "App Manager" role.
*   Note the **Issuer ID** (at the top of the page) and save it as `APPLE_API_ISSUER_ID`.
*   Note the **Key ID** (in the table) and save it as `APPLE_API_KEY_ID`.
*   Download the `.p8` file. You can only download this once!
*   Base64 encode the `.p8` file (Mac: `base64 -i AuthKey_XXX.p8 | pbcopy`) and paste it into `APPLE_API_KEY_P8_BASE64`.
*   Find your Team ID in the Developer Portal (usually a 10-character string like `ABC123DEFG`) and save it as `APPLE_TEAM_ID`.



### Firebase Setup (Meteor Cordova)

If you are using Firebase with Meteor Cordova, you need to provide the configuration files.

**1. Android (`FIREBASE_SERVICES_JSON_BASE64`):**
*   Go to your Firebase Console > Project Settings.
*   Download the `google-services.json` file for your Android app.
*   Base64 encode it: `base64 -i google-services.json | pbcopy`
*   Paste it into the `FIREBASE_SERVICES_JSON_BASE64` secret.

**2. iOS (`FIREBASE_IOS_PLIST_BASE64`):**
*   Download the `GoogleService-Info.plist` file for your iOS app.
*   Base64 encode it: `base64 -i GoogleService-Info.plist | pbcopy`
*   Paste it into the `FIREBASE_IOS_PLIST_BASE64` secret.



## 2. Server Setup (Proxmox / Bare-metal)

We have generated setup scripts in the `scripts/` directory. You need to run these on your server **once** before your first deployment.

1. SSH into your server.
2. Copy the `scripts/` folder to your server.
3. Run the setup script:
   ```bash
   ./scripts/setup-systemd.sh
   ```
4. Create a `~/scripts/set-env.sh` file on your server to hold your production environment variables (e.g., `MONGO_URL`, `ROOT_URL`).


## 3. Next Steps
Commit and push the generated files to your repository to trigger the pipeline!
