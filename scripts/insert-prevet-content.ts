import { config } from 'dotenv';
config({ path: '.env.local' });

const prevetContent = `On the company page slideout in EMAP:
Add a "Send Pre-Vet Requests" button which launches the modal below
Add a "Pre-vets" table to the Applications section which tracks the status of pre-vets and allows quick application creation
Status should be manually updated by staff for now


On the Pre-Vet Modal:
Show the current staff member's email (uneditable) as the From address
Allow staff to add any supported processor
Add a new field to the processor settings "Pre-Vet Email"
Initial list of email addresses can be pulled from here
Show this email address on hover once a processor has been added to the recipient list
Each processor should receive an exclusive email (do not CC or BCC multiple processors)
Pre-populate the subject line, but allow staff to edit it
Subject line should be Pre-Vet {{ Processor Acronym }} | {{ Company DBA }}
Allow staff to attach (and remove) and documents associated with this company
By default attach these documents:
Processing Statements
Bank Statements
Other documents should be attachable with MPAs/Applications sorted at the end of the list
Show the number of selected processors in the submit button (to 2 processors)
Pre-populate email content with the body text (editable by the user)Hello Team!

We'd like to see if you're open to underwriting this merchant. We can submit a full package if this is of interest.

PV: RMV (Requested Monthly Volume): {{ PV: Monthly Requested }}
Industry: {{ Industry }}
Website: {{ Website }}
Billing Method(s): {{ One Time/Subscription/Trial }}
High Ticket: \${{ High Ticket }}
Sales Method: {{ eCommerce/MOTO/Swiped %s }}

Description: {{ Details }}

Attachments are included below. Looking forward to your assessment.

Best regards,
{{ Staff Full Name }}



In HubSpot:
Each email should be associated with the staff member and Company sending the pre-vet
Responses should come in and log to the correct Company record
Can we show pre-vet statuses in the HubSpot company record somehow?


Cameron Rivers notes and UI ideas for the complete pre-vet functionality.

Only listed attaching the back-and-forth emails to the Company record in HubSpot, as other options for surfacing the statuses have not been explored.

The UI is also preliminary / functional and will be adapted to match the existing EMAP appearance during implementation.


Brad Weimert Questions/Feedback:
Where will the pre-vet pending/accepted/rejected status show up in HubSpot? For all sent to.

Subject line should be "Subject: Pre-Vet [Processor Acronym] | [DBA]"
[Processor Acronym] and [DBA] should merge according to records.

Default documents to add:
Processing Statements
Bank Statements
(the rest should not be added by default but it should be possible to add them - and they should be ordered with other MPAs last)

Send button should have dynamic text under "Send Pre-Vet" of "( to X processors )" where x = number of ISOs we're sending to


Cameron Rivers Response:
Where will the pre-vet pending/accepted/rejected status show up in HubSpot? For all sent to?
We can attach the pre-vet emails to the Company record, so there will be a history there. No good solution yet for quickly displaying the statuses, but investigation tasks exist for this request.


Brad Weimert Suggestions for HubSpot Status Display:
Could ask Molly.
Could use a multiple checkboxes field
Use "Text inside colored tags" on a dropdown field for "MAV Pre-Vet Pending" "MAV Pre-Vet Rejected" or "MAV Pre-Vet Accepted" (yellow, green, red)
Could do 3 fields - one for each status or one field that holds all providers and statuses
Molly may have an opinion on which would be easier to work with from an automation perspective.
Could set those fields to conditional, and the upper left of a company record, so they only showed if there was a value in them.
Want them visually present on the company - and hopefully the deal record.`;

async function main() {
  // Dynamic import after env is loaded
  const { embedDocument } = await import('../lib/embed-document');

  try {
    const result = await embedDocument({
      source_type: 'feature_spec',
      source_id: 'emap-prevet-feature-v1',
      source_url: undefined,
      title: 'EMAP Pre-Vet Feature Specification',
      content: prevetContent,
      metadata: {
        feature: 'pre-vet',
        application: 'EMAP',
        status: 'planning',
        contributors: ['Cameron Rivers', 'Brad Weimert', 'Mike Usey', 'Mayur Gaud'],
        integrations: ['HubSpot'],
      },
    });

    console.log('Document inserted successfully!');
    console.log('ID:', result.id);
    console.log('Content Hash:', result.content_hash);
  } catch (error) {
    console.error('Error inserting document:', error);
    process.exit(1);
  }
}

main();
