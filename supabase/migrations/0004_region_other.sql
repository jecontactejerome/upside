-- ============================================================
--  Upside — autoriser des valeurs hors indices (ajout manuel par ticker)
--  région 'OTHER' pour les places hors US / Europe (Taïwan, etc.)
-- ============================================================
alter type region_t add value if not exists 'OTHER';
