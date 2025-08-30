import { google } from 'googleapis';
import express from 'express';
import open from 'open';
import fs from 'fs/promises';
import path from 'path';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export class BloggerOAuth {
  private oauth2Client: any;
  private config: OAuthConfig;
  private tokenFile: string;

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: 'http://localhost:3000/oauth/callback',
      scopes: ['https://www.googleapis.com/auth/blogger']
    };

    this.tokenFile = path.join(process.cwd(), 'tokens.json');
    
    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );
  }

  async getAuthenticatedClient() {
    // Try to load existing tokens
    try {
      const tokenData = await fs.readFile(this.tokenFile, 'utf8');
      const tokens: StoredTokens = JSON.parse(tokenData);
      
      this.oauth2Client.setCredentials(tokens);
      
      // Check if token is expired and refresh if needed
      if (Date.now() >= tokens.expiry_date) {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveTokens(credentials);
        this.oauth2Client.setCredentials(credentials);
      }
      
      return this.oauth2Client;
    } catch (error) {
      // No valid tokens found, need to authenticate
      return await this.performOAuthFlow();
    }
  }

  private async performOAuthFlow() {
    return new Promise<any>((resolve, reject) => {
      const app = express();
      let server: any;

      // Generate the URL for OAuth consent
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.config.scopes,
        prompt: 'consent' // Force consent to get refresh token
      });

      // Handle the OAuth callback
      app.get('/oauth/callback', async (req, res) => {
        const { code, error } = req.query;

        if (error) {
          res.send(`Authentication failed: ${error}`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.send('No authorization code received');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        try {
          // Exchange code for tokens
          const { tokens } = await this.oauth2Client.getToken(code as string);
          await this.saveTokens(tokens);
          this.oauth2Client.setCredentials(tokens);

          res.send(`
            <html>
              <body>
                <h2>Authentication Successful!</h2>
                <p>You can now close this window and return to Claude.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);

          server.close();
          resolve(this.oauth2Client);
        } catch (tokenError) {
          res.send(`Token exchange failed: ${tokenError}`);
          server.close();
          reject(tokenError);
        }
      });

      // Start temporary server
      server = app.listen(3000, () => {
        console.error('\n🔐 OAuth Setup Required');
        console.error('Opening browser for Google authentication...');
        console.error('Please complete the authentication in your browser.\n');
        
        // Open browser to start OAuth flow
        open(authUrl).catch(err => {
          console.error('Could not open browser automatically.');
          console.error('Please visit this URL manually:');
          console.error(authUrl);
        });
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth flow timed out after 5 minutes'));
      }, 300000);
    });
  }

  private async saveTokens(tokens: any) {
    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('Failed to save OAuth tokens:', error);
    }
  }

  async revokeAuth() {
    try {
      await this.oauth2Client.revokeCredentials();
      await fs.unlink(this.tokenFile).catch(() => {}); // Ignore if file doesn't exist
      console.error('Authentication revoked successfully');
    } catch (error) {
      console.error('Failed to revoke authentication:', error);
    }
  }
}