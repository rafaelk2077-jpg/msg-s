UPDATE auth.users SET
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change_token_current = '',
  reauthentication_token = '',
  phone = '',
  phone_change_token = '',
  phone_change = ''
WHERE email = 'rafael.m8020@msgas.com.br';