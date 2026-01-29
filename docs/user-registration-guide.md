# User Registration & Management Guide

Step-by-step instructions for managing users on deltoi.com.

---

## 0. Bootstrapping the First Admin User

Before anyone can register, you need an admin account. Since registration requires an invite token (which only admins can create), the first admin must be created via a CLI script:

```bash
pnpm tsx scripts/create-admin.ts <email> <username> <password>
```

Example:
```bash
pnpm tsx scripts/create-admin.ts admin@deltoi.com myadmin MySecurePassword123
```

If the email or username already exists, the script promotes that user to admin instead.

Once you have an admin, sign in at https://deltoi.com/login and proceed to step 1.

---

## 1. Generating an Invitation Token

Registration is invite-only. To add a new user, you must first generate a token.

1. Sign in as an admin at https://deltoi.com/login
2. Go to **Admin > Users** (https://deltoi.com/admin/users)
3. In the **Invitation Tokens** section, click **Generate Token**
4. A 64-character token string appears — copy it immediately
5. Send the token to the person you want to invite (email, message, etc.)

Token rules:
- Single-use — once someone registers with it, it cannot be reused
- Expires after 7 days
- You can revoke unused tokens from the admin panel (click **Revoke**)
- You can generate tokens even if the 20-user cap is reached, but registration will fail at the cap check

---

## 2. How a New User Registers

Send the invitee these instructions along with their token.

### Option A: Email and Password

1. Go to https://deltoi.com/register
2. Paste the invitation token
3. Enter email, username, and password
4. Click **Register**
5. You will be redirected to the login page — sign in with your new credentials

### Option B: Google Sign-In

1. Go to https://deltoi.com/register
2. Paste the invitation token in the token field
3. Click **Sign in with Google**
4. Complete the Google sign-in flow
5. Your account is created and you are logged in automatically

Notes:
- If someone already has a credentials account and tries to register again via Google with the same email, they will be redirected to the login page with an error. Accounts are not automatically linked (this is a security measure).
- If the token is expired, used, or invalid, registration is rejected with a clear error message.
- If the 20-user cap has been reached, registration is rejected.

---

## 3. Reviewing Users

1. Go to **Admin > Users** (https://deltoi.com/admin/users)
2. The page shows:
   - **User count**: "N / 20 users registered"
   - **User list**: username, email, role, registration date for each user
   - **Invitation Tokens**: all tokens with status (Active / Used / Expired), creator, dates, and a Revoke button

---

## 4. Changing User Roles

Three roles exist:

| Role | Can do |
|------|--------|
| **user** | View texts, post discussion comments |
| **editor** | All of the above + edit translations, endorse versions |
| **admin** | All of the above + manage users, tokens, and roles |

To change a role:
1. Go to **Admin > Users**
2. Find the user in the list
3. Use the role dropdown next to their name to select the new role
4. The change takes effect immediately

---

## 5. Deleting a User (Admin)

1. Go to **Admin > Users**
2. Click **Delete** next to the user you want to remove
3. A confirmation prompt appears — click **Confirm** to proceed or **Cancel** to abort
4. The user's account is deleted. Their translations and discussion posts are preserved (reassigned to the system account).

You cannot delete your own account from the admin panel — use the profile page instead (see below).

---

## 6. User Self-Management

Users can manage their own account from the **Profile** page:

1. Click your username in the top-right header, or go to https://deltoi.com/profile
2. The profile page shows:
   - Account info (username, email, role, sign-in methods, join date)
   - **Change password** (only for users who registered with email/password)
   - **Delete my account** (in the Danger Zone section)

### Self-Deletion

1. Go to https://deltoi.com/profile
2. Click **Delete my account** in the red Danger Zone
3. Type your username to confirm
4. Click **Permanently delete my account**
5. Your content (translations, posts) is preserved but attributed to "[deleted user]". Your personal data is permanently removed and you are signed out.

---

## 7. Returning Users

Returning users sign in at https://deltoi.com/login using either their email/password or the Google button. No invitation token is needed to sign in — tokens are only for first-time registration.
