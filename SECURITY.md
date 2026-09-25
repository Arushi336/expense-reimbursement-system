# Security Policy — EERS Enterprise Expense Reimbursement System

## Secret Handling

- All production secrets MUST be provided via environment variables
- Application fails fast on startup if required secrets are missing
- JWT secrets, SMTP credentials, database URIs, and API keys are never stored in source code
- `.env` files are gitignored and must never be committed
- Use `backend/.env.example` as a template — it contains only placeholders

### Required Production Secrets

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `MONGO_URI` | MongoDB connection string |
| `SMTP_HOST` | SMTP mail server hostname |
| `SMTP_PORT` | SMTP mail server port |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `SMTP_FROM_EMAIL` | Sender email address |

### Generating Secure Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Vulnerability Reporting

If you discover a security vulnerability in EERS:

1. **DO NOT** open a public issue
2. Email the security team directly with details
3. Include steps to reproduce if possible
4. Allow up to 72 hours for initial response

## Authentication Architecture

### Access Tokens (JWT)
- **Lifetime**: 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Storage**: Memory only on frontend
- **Claims**: user ID, token type, issuer, audience
- **Validation**: issuer + audience + algorithm verification

### Refresh Tokens (JWT)
- **Lifetime**: 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Storage**: SHA-256 hashed before database storage
- **Rotation**: Old token revoked on every refresh
- **Reuse Detection**: If a used token is presented, ALL user tokens are revoked (family revocation)
- **Session Limit**: Maximum 5 active sessions per user

### Password Reset (OTP)
- 6-digit cryptographically secure OTP (`crypto.randomInt`)
- 10-minute expiration
- SHA-256 hashed storage with timing-safe comparison
- Single-use (consumed on verification)
- Maximum 5 verification attempts
- 60-second resend cooldown
- Generic response prevents email enumeration

## Password Policy

- Minimum 8 characters
- Must contain: uppercase letter, lowercase letter, digit, special character
- Common passwords are rejected (configurable blocklist)
- Passwords are hashed with bcrypt (salt rounds: 10)
- Never logged, never returned in API responses
- Password changes/resets revoke all active sessions

## Authorization Model

### Roles
| Role | Description | Access Level |
|---|---|---|
| Employee | Submit/manage own expense claims | Own resources only |
| HOD | Approve department claims | Own department claims |
| Finance | Financial audit of approved claims | All non-draft claims |
| Accounts | Process payments/settlements | Payment-stage claims |
| Admin | Full system administration | All resources |

### Authorization Enforcement
- **Backend-first**: Every API endpoint independently validates authorization
- **Frontend guards**: UX convenience only — never relied upon for security
- **IDOR/BOLA protection**: Resource ownership verified on every request
- **Registration**: Public registration creates Employee accounts ONLY

## Data Protection

### Sensitive Fields (never returned in API responses)
- `password`
- `refreshTokens`
- `resetPasswordOtp`
- `resetPasswordOtpExpire`
- `resetPasswordVerified`
- `resetPasswordOtpAttempts`

### Request/Response Security
- Request correlation IDs on every request
- Structured error responses (no stack traces in production)
- Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
- MongoDB injection prevention (`express-mongo-sanitize`)
- XSS protection (`xss-clean`)
- Request size limits (1MB body, 5MB uploads)
- Rate limiting on all endpoints (strict on auth endpoints)

### File Upload Security
- Allowed types: PNG, JPEG, JPG, PDF only
- 5MB per-file size limit
- Generated filenames (original filenames not trusted)
- Static file serving disabled in production
- Receipt access requires authentication

## Audit Logging

All security-relevant events are recorded:
- Login success/failure
- Logout
- Password changes/resets
- OTP verification attempts
- User CRUD operations
- Role changes
- Claim lifecycle events
- Payment processing
- System setting changes

Audit logs include: actor, action, detail, IP address, timestamp.
Audit logs never contain: passwords, OTP values, tokens, credentials.

## Incident Response

1. Identify and contain the incident
2. Revoke compromised credentials immediately
3. Rotate all JWT secrets if token compromise is suspected
4. Review audit logs for affected timeframe
5. Notify affected users
6. Document lessons learned
