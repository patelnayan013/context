import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'context-app',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
