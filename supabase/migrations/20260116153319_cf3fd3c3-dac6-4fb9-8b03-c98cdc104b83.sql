-- Confirm the existing user's email so they can sign in
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'sunandgarg@gmail.com';