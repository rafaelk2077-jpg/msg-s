-- Create user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'rafael.m8020@msgas.com.br',
  crypt('2qvprqgy', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Rafael"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
);

-- Add admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'rafael.m8020@msgas.com.br';

-- Create profile
INSERT INTO public.profiles (user_id, name, diretoria, gerencia)
SELECT id, 'Rafael', 'N/A', 'N/A' FROM auth.users WHERE email = 'rafael.m8020@msgas.com.br';