# Bugfix Requirements Document

## Introduction

The email automation system in the application has four critical bugs preventing email campaigns from being sent successfully. These bugs affect route parameter passing, approval workflow, provider configuration validation, and recipient email handling. Together, they make the email campaign feature effectively non-functional for production use.

The bugs impact the following areas:
- **Router configuration**: Route parameters are not accessible in handlers due to missing `mergeParams` option
- **Approval workflow**: Send operations are blocked by a strict approval gate that may not align with user expectations
- **Provider configuration**: Brevo email provider fails silently when API credentials are missing from environment variables
- **Bulk sending**: Campaign bulk send uses an audience description field instead of actual recipient email addresses

## Bug Analysis

### Current Behavior (Defect)

#### Bug 1: Missing mergeParams in Router Configuration

1.1 WHEN the email campaign router is mounted at `/api/chats` in `server.js` line 388 AND the router is created without `mergeParams: true` option in `email-campaign.routes.js` line 6 THEN the `req.params.chatId` parameter is undefined in all route handlers

1.2 WHEN any email campaign endpoint that depends on `chatId` is called (e.g., `/:chatId/email-campaign/generate`) THEN the handler receives `chatId` as undefined, causing database queries to fail or return incorrect results

#### Bug 2: Approval Gate Blocking Send Operations

1.3 WHEN a user attempts to send an email campaign via the `/send` endpoint AND the campaign's `approvalStatus` field is not set to 'APPROVED' THEN the `sendCampaignEmail` function at line 730 throws an error "Campaign must be approved before sending"

1.4 WHEN the error is thrown THEN no email is sent and the user receives an unclear error message without guidance on how to approve the campaign first

#### Bug 3: Silent Brevo Configuration Failure

1.5 WHEN the Brevo email provider is selected AND either `BREVO_API_KEY` or `BREVO_FROM_EMAIL`/`BREVO_SENDER_EMAIL` environment variables are missing THEN the provider registry returns `{ success: false, error: 'PROVIDER_NOT_CONFIGURED' }` without crashing or logging a clear error

1.6 WHEN email send operations are attempted with incomplete Brevo configuration THEN the operations fail silently without informative feedback to the user about what configuration is missing

#### Bug 4: Wrong Recipient Field in Bulk Send

1.7 WHEN the bulk send endpoint `/:chatId/email-campaign/:campaignId/send` is invoked at line 145 of the routes file THEN the code uses `campaign.audienceSummary` as the `recipientEmail` parameter

1.8 WHEN `audienceSummary` contains a text description (e.g., "B2B logistics managers") instead of an email address THEN Brevo rejects the request due to invalid email format, causing the send operation to fail

### Expected Behavior (Correct)

#### Bug 1 Fix: Enable mergeParams in Router

2.1 WHEN the email campaign router is created in `email-campaign.routes.js` line 6 THEN it SHALL be instantiated with `express.Router({ mergeParams: true })` to enable access to parent route parameters

2.2 WHEN email campaign endpoints are invoked with a `chatId` parent parameter THEN `req.params.chatId` SHALL be properly populated and accessible in all route handlers

#### Bug 2 Fix: Remove or Bypass Approval Gate

2.3 WHEN a user attempts to send an email campaign AND the campaign has not been explicitly approved THEN the system SHALL either remove the approval check or automatically approve the campaign before sending

2.4 WHEN the approval workflow is retained THEN the UI SHALL call the `/approve` endpoint before calling `/send`, ensuring the approval gate is satisfied without user confusion

#### Bug 3 Fix: Validate Brevo Configuration at Startup

2.5 WHEN the application starts THEN the system SHALL verify that both `BREVO_API_KEY` and `BREVO_FROM_EMAIL`/`BREVO_SENDER_EMAIL` environment variables are present if Brevo is the selected provider

2.6 WHEN Brevo configuration is incomplete THEN the system SHALL log a clear warning message indicating which specific environment variables are missing and email sending will fail

#### Bug 4 Fix: Use Real Recipient Emails in Bulk Send

2.7 WHEN the bulk send endpoint is invoked THEN the system SHALL accept a real recipient email list in the request body instead of using the `audienceSummary` text field

2.8 WHEN multiple recipients need to receive a campaign THEN the system SHALL iterate over the provided recipient list and send individual emails to each valid email address

### Unchanged Behavior (Regression Prevention)

#### Preserving Existing Router Functionality

3.1 WHEN the router is updated to include `mergeParams: true` THEN all existing route definitions and middleware SHALL CONTINUE TO function without modification

3.2 WHEN other routers in the application do not require merged parameters THEN they SHALL CONTINUE TO work as-is without requiring configuration changes

#### Preserving Non-Approval-Required Flows

3.3 WHEN test email sends are performed via the `/send-test` endpoint THEN they SHALL CONTINUE TO bypass the approval gate as they currently do

3.4 WHEN individual sequence item sends are performed via `/:campaignId/items/:itemId/send` THEN they SHALL CONTINUE TO function with the provided recipient email without requiring campaign approval

#### Preserving Other Email Provider Functionality

3.5 WHEN SMTP or other email providers are configured and selected THEN they SHALL CONTINUE TO work independently of Brevo configuration validation

3.6 WHEN email provider health checks are performed at startup THEN they SHALL CONTINUE TO report the status of all configured providers

#### Preserving Single-Recipient Send Functionality

3.7 WHEN test email sends or individual item sends provide a specific `recipientEmail` in the request body THEN those operations SHALL CONTINUE TO use the provided email address without using `audienceSummary`

3.8 WHEN email validation is performed on provided recipient emails THEN the existing EMAIL_REGEX validation SHALL CONTINUE TO reject invalid email formats
