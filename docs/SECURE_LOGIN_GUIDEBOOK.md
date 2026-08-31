# Secure Login and Financial Data Protection Guidebook

**Version:** 1.0
**Reviewed:** 2026-08-28
**Purpose:** A reusable build contract for public websites that create user accounts and protect sensitive financial information.

> **Security position:** No login is "airtight." A trustworthy system reduces risk through independent layers, fails closed, is continuously monitored, and is reviewed before it receives real financial data. A login page is only the visible front end of that system.

## 1. How to use this guide

Use this guide as a mandatory requirements document whenever an application will accept real user information, create accounts, or display financial data.

1. Complete the Implementation Brief in section 18.
2. Give the completed brief and this guide to the implementer.
3. Require a threat model and test plan before implementation.
4. Build authentication, sessions, authorization, recovery, data protection, and monitoring as one security boundary.
5. Do not accept real user data until every applicable release gate passes and an independent security review is complete.

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are deliberate:

- **MUST / MUST NOT:** release-blocking requirement.
- **SHOULD:** expected control; any exception needs a written risk decision and compensating control.
- **MAY:** optional and risk-dependent.

## 2. Review of the referenced chat

The referenced "Schematic Web Status" answer got the core architecture right:

- Prefer passkeys or a maintained identity provider over custom authentication.
- Use OpenID Connect Authorization Code flow with PKCE for federated login.
- Keep sessions under server control in protected cookies.
- Treat authentication and authorization as separate controls.
- Use modern password rules and password hashing only when passwords are unavoidable.
- Protect recovery, MFA changes, CSRF, XSS, logging, and deployment—not only the login form.
- Do not add a cosmetic JavaScript password gate to a static or local-only application.

This guide keeps those rules and adds what a reusable financial-data build contract needs:

- explicit account-registration and identity-data rules;
- financial-data isolation, encryption, export, deletion, and backup requirements;
- a local-device threat model for this Cashflow project;
- provider-selection and operational-security gates;
- abuse, support, incident-response, and compliance triggers;
- red/green security tests and a reusable implementation brief;
- a firm rule never to collect a user's bank password as an application credential.

## 3. The non-negotiable model

### 3.1 A login page is not the security boundary

The browser is attacker-controlled. Hidden buttons, client-side route guards, JavaScript checks, obfuscated code, and local storage do not protect data. The server MUST authenticate the session and authorize the exact action and resource on every protected request.

The minimum protected flow is:

```text
Browser
  |  HTTPS only
  v
Application backend / Backend-for-Frontend
  |-- managed identity provider or mature authentication framework
  |-- server-side session store
  |-- deny-by-default authorization policy
  |-- application database with per-user ownership
  |-- encryption/key-management service
  |-- security audit log and alerting
```

### 3.2 Capture only credentials for this website

The application MAY collect an email address, passkey, or application-specific password for the user's account.

The application MUST NOT ask for or store:

- a bank, credit-union, brokerage, payroll, Venmo, PayPal, or email password;
- another service's MFA code or recovery code;
- full payment-card data unless a validated business and PCI DSS design requires it;
- secrets that a reputable provider can collect in its own hosted, origin-bound flow.

If future functionality connects to a bank or financial institution, use that institution's authorization flow or a vetted financial-data provider's hosted connection component. The user enters financial-institution credentials only into the institution/provider surface, and the application receives a narrowly scoped token. The application MUST NOT proxy, log, or persist those credentials.

### 3.3 "Airtight" is not an acceptable claim

Security can be evaluated, tested, and improved; it cannot be guaranteed. Public language MUST say what controls were verified and when. It MUST NOT promise that compromise is impossible.

## 4. Required assurance target

This guide sets the default target to a high-assurance, multi-user financial application:

- Managed authentication using passkeys/WebAuthn and MFA.
- Server-side opaque sessions.
- Deny-by-default, per-user authorization on every route and object.
- Encryption in transit, at rest, and for backups with managed keys.
- Minimal collection and retention of personal data.
- Auditable security events without secrets in logs.
- Automated abuse protection and incident alerting.
- OWASP ASVS 5.0.0 Level 2 as the minimum verification baseline.
- Level 3 controls for administrative surfaces, encryption/key management, high-value actions, or where the threat model requires them.
- Independent security review and penetration testing before real financial data is accepted.

ASVS is a verification framework, not a certificate automatically earned by using a framework or provider. Every applicable requirement must be mapped to evidence.

## 5. Threat model and trust boundaries

Before coding, document the following.

### 5.1 Protected assets

- User identity and verified contact information.
- Password verifiers, passkey public keys, MFA configuration, and recovery-code hashes.
- Session identifiers and provider tokens.
- Financial transactions, balances, forecasts, uploads, exports, and notes.
- Encryption keys, signing keys, provider secrets, database credentials, and deployment credentials.
- Audit logs, support records, backups, and deletion records.

### 5.2 Expected attackers

- Anonymous internet attackers.
- Credential-stuffing and password-spraying operators.
- Phishing and social-engineering attackers.
- A valid user attempting to read or change another user's data.
- An attacker who steals a session, reset token, device, backup, or database copy.
- Malicious or compromised third-party scripts, packages, providers, administrators, or support accounts.
- Automated abuse that creates accounts, triggers emails, scrapes data, or causes denial of service.

### 5.3 Required trust boundaries

- Browser to application backend.
- Application backend to identity provider.
- Application to session store, database, mail provider, object storage, and key manager.
- User account to every other user account and tenant.
- Normal user to administrator and support functions.
- Production to development, test, analytics, and support environments.
- Live database to logs, exports, backups, and incident tooling.

### 5.4 Security invariants

The implementation MUST preserve all of these:

1. An unauthenticated request cannot obtain protected data or perform a protected action.
2. An authenticated user can access only resources explicitly authorized for that user's trusted server-side identity.
3. A client-supplied user ID, role, tenant ID, ownership flag, price, or account state never grants permission.
4. Authentication, recovery, MFA, and email-change flows cannot be used to discover accounts or take them over.
5. A stolen browser token has bounded lifetime and can be revoked server-side.
6. Passwords, tokens, recovery codes, encryption keys, and raw financial credentials never appear in logs, URLs, analytics, client storage, source control, or support tools.
7. Sensitive financial data is encrypted and is not copied into lower-trust systems without an explicit, documented need.
8. Security controls fail closed when the identity provider, session store, policy service, or key manager is unavailable.
9. Security-relevant actions are attributable, monitored, and retained according to policy.
10. Recovery and support processes are not weaker than normal authentication.

## 6. Reference architecture

### 6.1 Public multi-user website

Use a same-origin web application with a Backend-for-Frontend unless a documented requirement justifies a different design.

```text
Internet
  |
  | HTTPS + rate limiting + request limits
  v
Reverse proxy / edge protection
  |
  v
Backend-for-Frontend
  |-- OIDC Authorization Code + PKCE --> managed identity provider
  |-- opaque session ID --------------> server-side session store
  |-- authorization ------------------> policy/domain layer
  |-- encrypted user data ------------> private database/object storage
  |-- keys/secrets -------------------> managed key/secret service
  |-- redacted events ----------------> protected audit/alert pipeline
```

Required architecture decisions:

- The backend owns login callbacks, session creation, logout, and authorization.
- The browser receives only an opaque session cookie—not a database credential or long-lived bearer token.
- Protected data is returned only from authenticated, authorized server routes.
- The database is private and cannot be reached from the public internet.
- Production identity, database, secrets, and logs are separate from development and test.
- Administrative operations use a separate role, stronger MFA, shorter sessions, and preferably a separate administrative surface.

### 6.2 Current Cashflow application

Cashflow is currently a private, local-first application bound to `127.0.0.1`. That design does not need an internet login while it remains local and single-user.

Current facts verified on 2026-08-28:

- The Express API binds to `127.0.0.1` unless `HOST` is changed.
- `/api/state` returns financial application state without authentication.
- Assumption, classification, forecast, preview, and import routes accept mutations without authentication or CSRF protection.
- The SQLite database and source financial files are local and excluded from Git.
- The application does not provide application-level encryption for the SQLite database.

Therefore:

- Cashflow MUST remain bound to loopback in its current form.
- `HOST` MUST NOT be changed to a LAN or public address.
- The current `dist` build and API MUST NOT be published as an internet service.
- A frontend login screen would not make the current API safe.
- A website login does not protect files from another Windows account, malware, device theft, or an unencrypted backup.
- Local protection SHOULD include a strong Windows sign-in, automatic screen lock, least-privilege file permissions, supported endpoint protection, full-volume encryption such as BitLocker, and encrypted private backups.

If remote access or multiple users are requested, create a dedicated security spec and implement the public reference architecture before exposure. Do not treat changing the host binding as a deployment plan.

## 7. Identity provider and authenticator requirements

### 7.1 Preferred order

1. Passkeys/WebAuthn through a maintained identity provider or authentication platform.
2. OpenID Connect through a managed provider with phishing-resistant MFA available.
3. A mature framework's maintained authentication module.
4. Custom password authentication only when a documented requirement makes the first three unsuitable and specialist review is available.

Do not implement password hashing, OAuth/OIDC validation, WebAuthn ceremony verification, TOTP, recovery, or session cryptography from scratch.

### 7.2 Provider acceptance checklist

The selected provider MUST support:

- OpenID Connect Authorization Code flow with PKCE.
- Exact redirect URI registration and separate development/production clients.
- Passkeys/WebAuthn and a phishing-resistant MFA option.
- Secure email verification, factor enrollment, factor replacement, and account recovery.
- Token signing-key rotation and standards-based discovery metadata.
- Session revocation, user disablement, and recent-authentication/step-up controls.
- Rate limiting, credential-stuffing protection, and security event export.
- Tenant isolation, least-privilege administrator roles, and mandatory administrator MFA.
- A published security program, incident process, retention terms, subprocessors, and data-location information suitable for the application.
- Export or deletion paths that support the application's privacy obligations.

Record the chosen provider, SDK/library, exact version, configuration owner, data shared with it, fallback plan, and last review date. A vendor logo is not proof of secure configuration.

### 7.3 OIDC requirements

The implementation MUST:

- use Authorization Code flow with PKCE;
- pre-register and exactly match redirect URIs;
- validate `state`, PKCE, and `nonce` as applicable;
- validate the ID token's signature, issuer, audience, expiration, and authorized party where applicable;
- use only the provider's authenticated subject identifier as the external identity key;
- pin the expected issuer and allowed algorithms through maintained provider metadata;
- prevent login CSRF, authorization-code injection, mix-up, open-redirect, and token replay attacks;
- keep provider client secrets and refresh tokens on the server;
- avoid the implicit flow and resource-owner password grant;
- never place access, refresh, ID, session, or recovery tokens in URLs.

Use the maintained provider SDK or a mature standards library. Security-sensitive validation MUST NOT be handwritten.

## 8. Registration and user-information capture

### 8.1 Data minimization

The registration form SHOULD ask only for information required to create and recover the account. The default fields are:

- Email address.
- Passkey enrollment or application-specific password.
- Explicit acceptance of the current Terms and Privacy Notice versions.

Name, phone, address, date of birth, government ID, employer, and financial information MUST NOT be mandatory unless a documented product, legal, or fraud requirement needs them. Record the purpose, access, retention, and deletion rule for every collected field.

### 8.2 Registration flow

1. Normalize the email for delivery while preserving a display form; do not invent unsafe provider-specific canonicalization.
2. Create a random internal user ID unrelated to the email.
3. Start the account in an unverified, least-privileged state.
4. Send a short-lived, single-use verification link generated from a trusted configured origin.
5. Store only a hash of the verification token.
6. Mark the address verified only after the token is validated.
7. Require passkey or MFA enrollment before financial data can be added or viewed when the risk policy requires it.
8. Record security-relevant consent versions and timestamps without logging submitted credentials.
9. Notify the user of account creation and provide a way to report unauthorized creation.

Registration, verification resend, and invitation routes MUST be rate-limited by account, network, device/behavioral signals, and system-wide capacity. CAPTCHA MAY be introduced after suspicious activity but MUST NOT be the only abuse control.

### 8.3 Login-page behavior

The visible page MUST:

- use semantic HTML form controls, visible labels, keyboard operation, clear focus, and accessible error messaging;
- use standard `autocomplete` values so password managers and passkey UI work;
- permit paste, autofill, and a show-password control when passwords are supported;
- submit only to the expected HTTPS origin;
- use a generic failure message such as "The email or sign-in information is incorrect";
- avoid revealing whether an account exists, is disabled, uses a different provider, or has MFA;
- preserve roughly equivalent response behavior for existing and nonexistent accounts;
- contain no advertising, chat widgets, session replay, analytics, tag managers, or unnecessary third-party JavaScript;
- avoid untrusted HTML and inline script patterns that weaken Content Security Policy.

The page MUST NOT store credentials or tokens in `localStorage`, `sessionStorage`, IndexedDB, URL parameters, client logs, or analytics.

## 9. Password fallback

When passwords are supported, follow NIST SP 800-63B-4 and the current OWASP Password Storage guidance.

### 9.1 Password policy

- Require at least 15 characters for a password used as a single factor.
- A password used only within MFA may be shorter, but never less than 8 characters.
- Support at least 64 characters.
- Permit spaces and all printable ASCII characters; support Unicode where the implementation can normalize and test it safely.
- Do not impose arbitrary uppercase/lowercase/number/symbol composition rules.
- Do not force periodic rotation without evidence of compromise.
- Block common, expected, context-specific, and compromised passwords.
- Verify the full password and never silently truncate it.
- Allow password managers, paste, autofill, and generated passwords.
- Do not use hints, knowledge-based questions, or security questions.

### 9.2 Password storage

Prefer the identity provider's password storage. If the application must store password verifiers:

- Use the maintained framework/library implementation of Argon2id.
- Meet or exceed the current OWASP baseline: 19 MiB memory, 2 iterations, parallelism 1.
- Generate a unique random salt for every password.
- Store algorithm and work-factor version metadata to support upgrades.
- Benchmark a higher safe work factor in the production environment and rehash after login when parameters change.
- If a pepper is used, keep it in a managed secret or key service separate from the password database and maintain a rotation/recovery plan.
- Use constant-time library verification.

Never store plaintext passwords, reversibly encrypted passwords, password logs, or passwords hashed directly with MD5, SHA-1, SHA-256, SHA-512, or another fast general-purpose hash.

## 10. MFA, step-up authentication, and recovery

### 10.1 MFA policy

MFA MUST be required for:

- administrators, support users, and operators;
- access to real financial information in the high-assurance default profile;
- exports, account deletion, recovery changes, email changes, password changes, factor changes, and session revocation;
- actions identified as high impact by the product threat model.

Preferred order:

1. Passkey or hardware security key.
2. Authenticator application/TOTP as a non-phishing-resistant fallback.
3. Single-use recovery code.
4. SMS or email only as a constrained recovery fallback after documented risk review.

### 10.2 Factor changes

Adding, replacing, or removing a factor MUST require a recently authenticated session and proof using an existing factor. Notify the user through an independently verified channel. High-risk changes SHOULD trigger a temporary hold on sensitive actions.

### 10.3 Recovery

The recovery path MUST NOT be weaker than login.

- Return the same public response for existing and nonexistent accounts.
- Rate-limit requests by account, network, device/behavioral signals, and total system load.
- Use cryptographically random, purpose-bound, account-bound, single-use, short-lived tokens.
- Store only token hashes.
- Construct links from a configured trusted origin, never an untrusted `Host` header.
- Require the new password twice when resetting a password.
- Do not automatically log the user in after reset.
- Revoke affected sessions and tokens according to policy.
- Notify the user after reset or recovery.
- Hash single-use recovery codes and show them only once.
- Do not let support remove MFA based on public records or knowledge questions.

## 11. Session management

Use an opaque random session identifier with server-side session state.

```http
Set-Cookie: __Host-session=<opaque-random-value>; Path=/; Secure; HttpOnly; SameSite=Lax
```

Use `SameSite=Strict` when the complete authentication and product flow supports it. `Lax` is often needed for top-level OIDC redirects. Cookie policy MUST be tested rather than copied blindly.

Required controls:

- At least 128 bits of cryptographically secure randomness when a session ID must be generated directly; prefer the framework generator.
- `Secure`, `HttpOnly`, explicit `SameSite`, `Path=/`, no `Domain`, and the `__Host-` prefix.
- Server-side expiry and revocation.
- Rotation after login, privilege change, recovery, password reset, and other authentication-state changes.
- Logout that invalidates the server session before clearing the cookie.
- "Log out all devices" and administrative revocation capabilities.
- No session IDs or bearer tokens in URLs or browser storage.
- Cache prevention for sensitive responses (`Cache-Control: no-store`) and no protected data in service-worker caches.

Default starting policy for financial data:

- 15-minute idle timeout.
- 4-hour absolute timeout.
- Reauthentication within the last 5 minutes for exports, security changes, account deletion, and other high-impact actions.

These values require risk and usability testing. Server-side enforcement is mandatory; client timers are only user-interface aids.

## 12. Authorization and user-data isolation

Authentication answers "who is this?" Authorization answers "may this identity perform this action on this object?"

Every protected request MUST:

1. Resolve the user from the validated server session.
2. Identify the exact operation and resource.
3. enforce account status, role, ownership, and tenant boundaries from trusted server data;
4. deny the request if no explicit policy allows it;
5. record an appropriate audit event for sensitive or denied operations.

Rules:

- Use random, non-sequential public identifiers, but never treat unguessability as authorization.
- Scope every query and mutation by the trusted user/tenant identity.
- Use parameterized database queries and transactions for security-sensitive state changes.
- Separate user, support, administrator, service, and background-job permissions.
- Support personnel SHOULD use time-limited, approved access with purpose and audit records; avoid universal impersonation.
- Background jobs MUST carry a trusted service identity and the smallest required scope.
- Downloads, exports, object storage, WebSockets, queues, scheduled jobs, and cached responses need the same authorization as normal API routes.
- Prevent cross-user cache keys and shared CDN caching of private responses.

Hiding a button or route in React is not authorization. Tests MUST attempt direct API access with missing, incorrect, expired, revoked, lower-privilege, and other-user sessions.

## 13. Financial-data protection

### 13.1 Collection and retention

- Collect the minimum data needed for a stated product purpose.
- Maintain an inventory showing where each sensitive field is collected, transmitted, stored, copied, backed up, logged, exported, and deleted.
- Define retention by data category and automatically delete expired data.
- Provide user export and deletion flows only after recent authentication and authorization.
- Avoid copying production financial data into development, test, support, analytics, crash reports, or AI systems.
- Use synthetic fixtures for testing.

### 13.2 Encryption

- Use HTTPS for the entire production origin and all service-to-service traffic.
- Permit only currently supported TLS configurations; redirect HTTP to HTTPS and enable HSTS after safe deployment testing.
- Encrypt databases, object storage, queues, and backups at rest.
- Use managed key services or OS-backed secure storage; keep keys separate from encrypted data.
- Separate keys and credentials by environment and purpose.
- Restrict decrypt permission to the smallest runtime identity.
- Define and test key generation, rotation, revocation, backup, and disaster recovery.
- Never hard-code keys or commit them to source control.

Full-disk encryption protects powered-off media. Database or application-layer encryption can provide additional separation. Neither protects data after a fully compromised application decrypts it, so access control, patching, monitoring, and minimization remain required.

### 13.3 Files and imports

- Limit upload size, row count, field length, type, and processing time.
- Validate actual content rather than trusting filename or browser MIME type.
- Generate safe storage names and keep uploads outside the public web root.
- Reject active content and archive traversal; do not execute uploads.
- Parse with maintained libraries under least privilege.
- Avoid retaining raw uploads once the documented purpose and audit needs are satisfied.
- Prevent formula injection when producing CSV/Excel exports.
- Redact account numbers and sensitive fields from previews, errors, and logs.

### 13.4 Backups and deletion

- Encrypt backups with keys not stored beside the backup.
- Restrict and audit backup access.
- Test restoration and key recovery.
- Define recovery point and recovery time objectives.
- Include replicas, exports, object versions, and backups in the deletion/retention policy.
- Document when deletion from immutable backups is delayed and how restored data is re-deleted.

## 14. Web and API defenses

### 14.1 CSRF

For cookie-authenticated applications:

- Never change state through `GET`.
- Use the framework's synchronizer-token protection or a correctly implemented signed double-submit design when appropriate.
- Validate `Origin` and/or `Referer` for state-changing requests where supported.
- Treat `SameSite` as defense in depth, not the only CSRF control.
- Require recent authentication and explicit confirmation for high-impact actions.

### 14.2 XSS and browser policy

- Use framework escaping and context-specific encoding.
- Do not pass untrusted values to `innerHTML`, `eval`, dynamic script creation, or unsafe URL sinks.
- Sanitize user-authored HTML only with a maintained sanitizer and allowlist.
- Deploy a restrictive nonce- or hash-based Content Security Policy without `unsafe-inline` or `unsafe-eval` unless a documented migration requires a temporary exception.
- Set `frame-ancestors`/anti-clickjacking policy, `object-src 'none'`, a restrictive `base-uri`, and a minimal `connect-src`.
- Use `Referrer-Policy`, `X-Content-Type-Options`, and a deliberate `Permissions-Policy`.
- Keep authentication and financial pages free of unnecessary third-party code.

### 14.3 API and server controls

- Validate type, range, length, format, and allowed values at the server boundary.
- Reject unexpected fields for security-sensitive requests.
- Set request-size and processing-time limits.
- Use exact CORS origins only when cross-origin access is required; never combine arbitrary origins with credentials.
- Return generic external errors and detailed correlation IDs; do not return stack traces, SQL, file paths, secrets, or provider internals.
- Disable unnecessary methods and framework disclosure headers.
- Rate-limit authentication, recovery, verification, export, import, search, and expensive endpoints independently.
- Apply security limits at more than one layer so a single IP is not the only abuse identity.

## 15. Logging, monitoring, and incident response

### 15.1 Log security events

Log, with a safe event ID and server-derived subject where available:

- successful and failed authentication;
- throttling, abuse challenges, and blocked credential-stuffing;
- registration, verification, password reset, recovery, and email change;
- MFA enrollment, replacement, removal, and failed challenges;
- session creation, revocation, and logout-all;
- authorization failures and cross-tenant attempts;
- financial-data export, bulk access, deletion, and administrative access;
- role, permission, key, secret, and security-configuration changes.

### 15.2 Never log secrets

Do not log:

- passwords or password fields;
- full request bodies for authentication, recovery, MFA, or financial imports;
- session IDs, access tokens, refresh tokens, ID tokens, CSRF tokens, verification tokens, or recovery codes;
- encryption keys, signing keys, database credentials, connection strings, or secret environment values;
- full account numbers or unnecessary financial and personal information.

Protect logs with least privilege, integrity controls, retention limits, time synchronization, and alerts. Test redaction. A log statement is not a monitoring program unless someone or an automated response acts on relevant events.

### 15.3 Incident readiness

Before launch, maintain and exercise a plan to:

1. Disable compromised accounts, providers, keys, clients, sessions, or features.
2. Revoke all affected sessions and rotate exposed secrets or keys.
3. Preserve relevant evidence without copying unnecessary user data.
4. Determine scope using audit events and data inventory.
5. Notify owners, providers, insurers, counsel, regulators, and affected users when applicable.
6. Restore from known-good artifacts and verify authorization boundaries.
7. Record corrective actions and retest them.

Provider and administrator accounts MUST have break-glass recovery that is protected, monitored, tested, and not dependent on the same failed identity path.

## 16. Secure delivery and operations

- Use maintained versions of the framework, authentication SDK, runtime, database, and operating system.
- Pin dependencies with a lockfile; review lockfile changes and package provenance.
- Run tests, type checks, linting, dependency review, secret scanning, static analysis, and production builds in CI.
- Generate a software bill of materials when required by the deployment or customer risk profile.
- Use least-privilege deployment identities and short-lived credentials.
- Require review for authentication, authorization, cryptography, account recovery, logging, and infrastructure changes.
- Protect branches and deployments; separate code approval from production deployment for high-risk systems.
- Use immutable/reproducible deployment artifacts and a rollback process.
- Configure production through managed secrets and validated settings; fail startup when required security settings are missing.
- Monitor certificate renewal, provider key rotation, email delivery, session-store health, database access, and security alert delivery.
- Reassess the threat model after new data types, integrations, roles, export features, support tools, or exposure changes.

## 17. Compliance and business gates

Security controls do not decide legal scope. Before accepting real users, identify the operating jurisdictions, business model, age restrictions, data types, service providers, and contractual promises with qualified privacy/security counsel.

At minimum, determine whether any of these apply:

- FTC Safeguards Rule / Gramm-Leach-Bliley obligations for a covered financial institution.
- PCI DSS when payment-card data enters the system or its service-provider chain.
- State, national, or international privacy, breach-notification, deletion, access, and retention requirements.
- Children's privacy or age-assurance requirements.
- Bank, payroll, employer, credit-reporting, tax, health, or investment-data restrictions.
- Contractual requirements imposed by identity, hosting, financial-data, payment, email, or enterprise providers.

Prefer hosted payment and financial-connection components that keep high-risk credentials and card data out of the application's environment. Document the resulting responsibility boundaries; outsourcing collection does not outsource all security or legal responsibility.

## 18. Implementation Brief — complete before every build

Copy and complete this section. If an item is unresolved, mark it **BLOCKED** rather than allowing the implementer to guess.

```text
PROJECT
- Name:
- Repository/root:
- Production origin(s):
- Deployment environment/provider:
- Internet-facing, private remote, LAN-only, or loopback-only:
- Single-user, single-tenant, or multi-tenant:

USERS AND ACCESS
- Who may register:
- Is registration open, invite-only, or administrator-created:
- Roles:
- Administrator/support model:
- Minimum user age or eligibility constraints:

AUTHENTICATION
- Managed identity provider:
- Maintained SDK/framework and version:
- Passkey/WebAuthn support:
- Password fallback allowed (yes/no and reason):
- Required MFA methods:
- Recovery methods:
- OIDC issuer, client, and exact production redirect URI ownership:

SESSIONS
- Server-side session store:
- Idle timeout:
- Absolute timeout:
- Recent-authentication window:
- Logout-all and administrative revocation owner:

AUTHORIZATION
- Resource ownership model:
- Tenant boundary:
- Role/permission matrix owner:
- High-impact actions requiring step-up authentication:

DATA
- Personal fields collected and purpose for each:
- Financial fields/files collected and purpose for each:
- Explicitly prohibited data:
- Database/object storage:
- Encryption/key manager:
- Retention and deletion schedule:
- Export format and authorization:
- Backup, restore, and key-recovery owner:

OPERATIONS
- Security log and alert destination:
- Incident owner and contact path:
- Provider/security configuration owner:
- Dependency and patch owner:
- Legal/privacy review owner:
- Independent security reviewer and scheduled date:

RELEASE
- ASVS target and mapped checklist location:
- Automated security-test location:
- Penetration-test scope/date:
- Accepted risks and approving owner:
- Go-live approval owner:
```

## 19. Required implementation workflow (red/green security TDD)

### Phase 0 — establish the boundary

1. Verify repository, branch, dirty state, deployment configuration, and existing security guidance.
2. Confirm the application is not publicly exposed before controls exist.
3. Complete the Implementation Brief, data inventory, trust-boundary diagram, threat model, and authorization matrix.
4. Select and configure the identity provider in isolated development and production tenants/clients.
5. Write the applicable ASVS 5.0.0 requirement mapping.

### Phase 1 — write failing tests

Before implementation, demonstrate failing tests for at least:

- anonymous access to every protected read and mutation;
- User A reading, editing, exporting, or deleting User B's data;
- a normal user calling administrator/support endpoints;
- client-supplied user/tenant/role fields attempting privilege escalation;
- revoked, expired, malformed, replayed, and fixed session identifiers;
- missing/invalid CSRF protection on every state-changing route;
- login and recovery account enumeration;
- unsafe redirect targets and altered OIDC callback state/nonce/issuer/audience;
- password, token, session, or financial-secret leakage to logs, URLs, or browser storage;
- rate-limit and abuse-control behavior;
- insecure cookie flags and cache headers;
- recovery-token reuse and expired-token handling;
- factor replacement without recent authentication/existing-factor proof;
- upload oversize, malformed content, path tricks, formula injection, and excessive processing.

The red test must fail for the expected security reason. A setup error is not useful evidence.

### Phase 2 — smallest secure vertical slice

1. Add provider-backed login and callback validation.
2. Create the server-side session and protected cookie.
3. Add one centralized authentication middleware.
4. Add centralized deny-by-default authorization with per-user query scoping.
5. Protect one representative read and one representative mutation.
6. Make the focused tests green.
7. Extend the same verified boundary to every route, download, job, and object.

Avoid a broad visual redesign during security work. The smallest correct security boundary is easier to review.

### Phase 3 — complete the lifecycle

Implement and test registration, verification, MFA, recovery, email change, session management, logout-all, account deletion, export, administrator access, logging, alerting, retention, backups, and incident controls.

### Phase 4 — verify the whole system

- Run unit, integration, browser, type, lint, build, dependency, and security checks.
- Test through a normal browser over the real production-like HTTPS topology.
- Inspect cookies, headers, redirects, browser storage, caches, and network calls.
- Review identity-provider and infrastructure configuration separately from application code.
- Perform independent code review and penetration testing.
- Fix findings and retest; do not waive failed release gates silently.

## 20. Release gate

Do not accept real financial data or describe the system as secure until every applicable item is verified with dated evidence.

### Architecture and exposure

- [ ] Production is HTTPS-only; HTTP redirects safely; HSTS was enabled after validation.
- [ ] The database, session store, object storage, administrative endpoints, and key services are not publicly reachable.
- [ ] Development, test, and production identities, data, keys, and clients are separated.
- [ ] The provider, SDK/library, versions, redirect URIs, origins, and owners are documented.

### Authentication and registration

- [ ] OIDC uses Authorization Code with PKCE and exact redirect URIs.
- [ ] Callback validation covers state/nonce/PKCE, issuer, audience, signature, expiration, and allowed algorithms.
- [ ] Passkeys or phishing-resistant MFA are available and required by policy.
- [ ] Registration collects only documented fields and verifies contact information.
- [ ] Password policy/storage meets section 9 when passwords exist.
- [ ] Authentication and registration errors do not enumerate accounts.
- [ ] Login, verification, and recovery are rate-limited and monitored.

### Sessions and browser

- [ ] The browser has only an opaque `__Host-` session cookie with `Secure`, `HttpOnly`, and explicit `SameSite`.
- [ ] Session and provider tokens are absent from URLs, browser storage, analytics, logs, and service-worker caches.
- [ ] Session identifiers rotate after authentication-state and privilege changes.
- [ ] Idle, absolute, recent-authentication, revocation, logout, and logout-all controls work server-side.
- [ ] Sensitive responses use safe cache controls.
- [ ] CSP and other browser security headers pass automated and browser inspection.

### Authorization and data isolation

- [ ] Anonymous requests cannot access protected APIs, pages, files, exports, jobs, or sockets.
- [ ] User A cannot access User B's data by changing an identifier or request body.
- [ ] Tenant and role boundaries are derived from trusted server state and tested.
- [ ] Administrator/support access is least-privilege, MFA-protected, time-bounded where practical, and audited.
- [ ] Cache, search, background-job, download, and object-storage paths preserve user isolation.

### Financial data

- [ ] The system never collects another service's password or MFA/recovery secret.
- [ ] Data inventory, purpose, retention, export, and deletion rules are approved.
- [ ] Database, object storage, queues, and backups are encrypted; key separation and rotation are tested.
- [ ] Production data is absent from source control, client bundles, lower environments, analytics, crash reports, and AI tools.
- [ ] Imports and exports pass size, parser, content, formula-injection, and redaction tests.
- [ ] Backup restoration and deletion-after-restore procedures are tested.

### Recovery and monitoring

- [ ] Reset/verification/recovery tokens are hashed, single-use, purpose-bound, account-bound, short-lived, and built from a trusted origin.
- [ ] MFA replacement/removal and recovery require the approved strong process and notify the user.
- [ ] Security events are logged without secrets and generate actionable alerts.
- [ ] Session/key/provider compromise and breach-response procedures were exercised.

### Independent assurance

- [ ] Applicable OWASP ASVS 5.0.0 requirements are mapped to evidence.
- [ ] Automated security tests run in CI and block release.
- [ ] Dependency, secret, static-analysis, and production-artifact checks pass.
- [ ] Independent security review and penetration test findings are resolved or explicitly accepted by the accountable owner.
- [ ] Legal/privacy/compliance review is complete for the actual business, users, jurisdictions, and data.

## 21. Forbidden patterns

| Forbidden pattern | Why it fails |
|---|---|
| Login implemented only in React/JavaScript | An attacker can bypass it and call the API directly. |
| Publishing the current Cashflow API after adding a login component | Existing server routes remain unauthenticated and unauthorized. |
| Collecting bank or third-party passwords | Creates an extreme credential-theft and compliance risk. |
| Custom OAuth, WebAuthn, MFA, or password cryptography | Subtle validation and lifecycle errors cause account takeover. |
| JWT/access/refresh token in browser storage | XSS can disclose the bearer credential. |
| Long-lived bearer token without revocation | Stolen access persists until expiry. |
| Role, user ID, tenant, or ownership accepted from the browser | Enables privilege escalation and cross-user access. |
| Authorization enforced by hidden UI | Direct requests bypass the visual restriction. |
| Password in plaintext, reversible encryption, or fast hash | Database compromise becomes credential compromise. |
| Detailed login/reset errors | Enables account discovery and targeted attacks. |
| Permanent lockout after a few failures | Attackers can deny service to other users. |
| Security questions or weak support recovery | Public or guessed information defeats MFA. |
| Logout that only clears the browser cookie | The server session may remain usable. |
| SameSite as the only CSRF protection | Some state-changing cross-site attacks remain possible. |
| Wildcard redirect URIs or unvalidated return URLs | Codes or sessions can be redirected to an attacker. |
| Secrets in source, `.env` committed to Git, or frontend bundles | Visitors or repository readers can retrieve them. |
| Raw request/transaction logging | Credentials and financial data spread into weaker systems. |
| Encrypting data while storing the key beside it | A single compromise reveals both. |
| Assuming a provider makes the application secure | Authorization, sessions, data, deployment, and recovery can still fail. |
| Claiming "airtight," "unhackable," or "100% secure" | It is unprovable and hides residual risk. |

## 22. Reusable handoff prompt

Use the following prompt with this guide and a completed Implementation Brief:

```text
Build the authentication and protected-data boundary described in the attached
Secure Login and Financial Data Protection Guidebook and completed
Implementation Brief.

Treat every MUST/MUST NOT and every applicable release-gate item as binding.
Inspect the live repository, current security guidance, deployment topology,
identity-provider documentation, and current primary standards before editing.
Do not expose the application, use real financial data in tests, change hosting,
commit, push, or deploy unless separately authorized.

Before coding:
1. Report the current exposure and authentication/authorization boundary.
2. Produce the data inventory, trust boundaries, threat model, role/resource
   authorization matrix, selected standards, and provider/configuration plan.
3. Identify unresolved decisions as blockers. Do not invent security policy.
4. Map applicable OWASP ASVS requirements to planned tests and evidence.

Use red/green security TDD. First demonstrate focused tests failing for the
expected missing control, then implement the smallest secure vertical slice,
then run focused and full verification. Use maintained provider/framework
libraries; do not hand-roll cryptography or protocol validation.

Completion requires dated evidence for every applicable release gate, browser
inspection over production-like HTTPS, provider/infrastructure configuration
review, and independent security review before real financial data is accepted.
Report remaining risks candidly. Do not call the result airtight.
```

## 23. Primary references

Recheck these sources before each implementation because standards and recommendations change.

- [NIST SP 800-63-4 Digital Identity Guidelines](https://pages.nist.gov/800-63-4/)
- [NIST SP 800-63B-4 Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [OWASP Application Security Verification Standard 5.0.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [PCI Security Standards Council: PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/)
- [FTC Safeguards Rule](https://www.ftc.gov/legal-library/browse/rules/safeguards-rule)
- [Microsoft BitLocker overview](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/)

## 24. Final rule

If authentication, authorization, recovery, encryption, operational ownership, monitoring, or independent verification is incomplete, the correct release decision is **do not accept real financial data yet**.
