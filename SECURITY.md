# Security policy

## Reporting

Report suspected vulnerabilities privately to the store owner through a verified offline contact. Do not include customer data, credentials, access tokens, database URLs, or unredacted screenshots in GitHub issues.

## Immediate incident response

1. Disable affected functionality or take the storefront offline.
2. Revoke GitHub, Vercel, database, payment, messaging, and media-provider credentials that may be exposed.
3. Invalidate application sessions by rotating the auth secret or incrementing affected users' `sessionVersion`.
4. Preserve provider/audit logs privately.
5. Identify affected customers and follow applicable legal/privacy notification requirements.
6. Patch, test, deploy, and verify anonymously before restoring service.

## Repository rules

Never commit:

- `.env` files;
- database files or dumps;
- order/customer exports;
- backups;
- access tokens or provider keys;
- production screenshots containing personal data;
- MFA secrets or backup codes.

Secret scanning and authorization regression tests should be required in CI.
