-- Kullanıcı profil fotoğrafı (Microsoft Graph'tan çekilen base64 data URL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
