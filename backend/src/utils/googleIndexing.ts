import { google } from 'googleapis';
import logger from '../core/logger'; // Assuming logger exists, fallback to console if needed

// We assume Google Cloud Service Account credentials are provided as a JSON string in ENV
// Or through GOOGLE_APPLICATION_CREDENTIALS file path
const getJwtClient = () => {
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/indexing'],
      });
    } else {
      // Fallback to default application credentials if GOOGLE_APPLICATION_CREDENTIALS is set
      return new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/indexing'],
      });
    }
  } catch (error) {
    logger.error('Failed to initialize Google Auth for Indexing API', error);
    throw error;
  }
};

/**
 * Submit a URL to Google Indexing API
 * @param url The exact URL to be indexed or updated
 * @param type 'URL_UPDATED' or 'URL_DELETED'
 */
export const submitUrlToIndex = async (url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') => {
  try {
    const authClient = getJwtClient();
    
    // Explicitly cast to JWT if possible to authorize, otherwise getClient()
    let client;
    if (authClient instanceof google.auth.JWT) {
      await authClient.authorize();
      client = authClient;
    } else {
      client = await (authClient as any).getClient();
    }

    const indexing = google.indexing({
      version: 'v3',
      auth: client as any,
    });

    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    logger.info(`Successfully submitted URL to Google Indexing API: ${url} (Type: ${type})`);
    return { success: true, data: res.data };
  } catch (error: any) {
    logger.error(`Error submitting URL to Indexing API: ${url}`, error.message || error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};
