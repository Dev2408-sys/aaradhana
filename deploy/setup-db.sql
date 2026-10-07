-- Run as postgres superuser on Contabo:
--   sudo -u postgres psql -f /var/www/aaradhana/deploy/setup-db.sql
-- Then set a strong password:
--   sudo -u postgres psql -c "ALTER USER aaradhana_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';"

CREATE USER aaradhana_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE aaradhana OWNER aaradhana_user;
GRANT ALL PRIVILEGES ON DATABASE aaradhana TO aaradhana_user;

\c aaradhana
GRANT ALL ON SCHEMA public TO aaradhana_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO aaradhana_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO aaradhana_user;
