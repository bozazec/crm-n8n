import { supabase } from './supabaseClient';

interface WebhookPayload {
  userId: string;
  data: any; // The actual data to send in the webhook
}

/**
 * Finds and triggers webhooks for a specific event type and user.
 * Logs errors to the console but does not throw them, allowing the main flow to continue.
 * @param eventType The event trigger (e.g., 'contact.created', 'activity.updated')
 * @param payload Object containing userId and the data payload for the webhook
 */
export const triggerWebhook = async (eventType: string, payload: WebhookPayload): Promise<void> => {
  const { userId, data } = payload;

  if (!userId) {
    console.error('Webhook trigger attempted without user ID.');
    return;
  }

  try {
    // 1. Find relevant webhooks
    const { data: webhooks, error: fetchError } = await supabase
      .from('webhooks')
      .select('id, url')
      .eq('event_trigger', eventType);

    if (fetchError) {
      console.error(`Error fetching webhooks for event ${eventType}:`, fetchError);
      return; // Don't proceed if we can't fetch webhooks
    }

    if (!webhooks || webhooks.length === 0) {
      // console.log(`No webhooks found for event ${eventType} for user ${userId}.`);
      return; // No webhooks configured for this event
    }

    // 2. Trigger each webhook
    console.log(`Found ${webhooks.length} webhook(s) for event ${eventType}. Triggering...`);

    const webhookPromises = webhooks.map(async (webhook) => {
      if (!webhook.url) {
        console.warn(`Webhook ${webhook.id} has no path configured. Skipping.`);
        return;
      }

      let webhookPath = webhook.url;
      // Defensively extract the path if it looks like a full URL was stored
      try {
        if (webhookPath.startsWith('http://') || webhookPath.startsWith('https://')) {
          const urlObject = new URL(webhookPath);
          webhookPath = urlObject.pathname + urlObject.search + urlObject.hash;
          console.warn(`Webhook ${webhook.id} contained a full URL. Extracted path: ${webhookPath}`);
        }
      } catch (e) {
        console.error(`Webhook ${webhook.id} has an invalid URL/path format: ${webhook.url}. Skipping.`);
        return; // Skip if the URL/path is invalid
      }

      // Ensure path starts with a slash if it doesn't (e.g., if user entered 'webhook/...' instead of '/webhook/...')
      if (!webhookPath.startsWith('/')) {
           webhookPath = '/' + webhookPath;
      }

      const proxiedUrl = `/api/n8n${webhookPath}`;

      try {
        const response = await fetch(proxiedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Consider adding a signature for security in a real application
            // 'X-Webhook-Signature': generateSignature(JSON.stringify(data)),
          },
          body: JSON.stringify({
            event: eventType,
            data: data,
            triggered_at: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          console.error(`Webhook ${webhook.id} (${proxiedUrl}) failed for event ${eventType}. Status: ${response.status} ${response.statusText}`);
          // Log response body if available for debugging
          try {
            const responseBody = await response.text();
            console.error(`Webhook response body: ${responseBody}`);
          } catch (bodyError) {
             console.error('Could not read webhook response body.');
          }
        } else {
          console.log(`Webhook ${webhook.id} (${proxiedUrl}) triggered successfully for event ${eventType}.`);
        }
      } catch (fetchCatchError: any) {
        console.error(`Error sending POST request to webhook ${webhook.id} (${proxiedUrl}) for event ${eventType}:`, fetchCatchError.message || fetchCatchError);
      }
    });

    // Wait for all webhook attempts to settle (complete or fail)
    await Promise.allSettled(webhookPromises);

  } catch (error: any) {
    // Catch any unexpected errors in the overall process
    console.error(`Unexpected error during webhook trigger for event ${eventType}:`, error.message || error);
  }
}; 