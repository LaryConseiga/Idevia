-- Rôle applicatif local : ni propriétaire des tables, ni BYPASSRLS (comme en production).
CREATE ROLE idevia_app LOGIN PASSWORD 'idevia_app_dev' NOSUPERUSER NOBYPASSRLS;
GRANT CONNECT ON DATABASE idevia TO idevia_app;
