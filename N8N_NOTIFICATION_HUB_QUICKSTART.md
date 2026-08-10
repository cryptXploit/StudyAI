# n8n Notification Hub Integration

*Status: In Progress / Planned for Phase 2*

We utilize **n8n** (Node-based automation) to handle our notification routing and admin workflows without writing boilerplate code.

## Planned Workflows
1. **Welcome Emails**: Triggered automatically when a new user signs up in Supabase.
2. **Payment Success**: When a bKash/Nagad manual payment is verified by the backend, a webhook is sent to n8n to dispatch an SMS/WhatsApp confirmation.
3. **Admin Alerts**: If the AI Fallback system is triggered repeatedly, n8n sends an alert to the developer's Telegram.

## Setup
n8n will be hosted on a separate Docker container within the docker-compose.yml network.
