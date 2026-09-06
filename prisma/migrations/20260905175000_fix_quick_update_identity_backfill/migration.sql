UPDATE "WorkdayQuickUpdate"
SET "identityKey" = CASE
  WHEN regexp_replace("phoneNumber", '[^0-9]', '', 'g') <> ''
    THEN 'phone:' || right(regexp_replace("phoneNumber", '[^0-9]', '', 'g'), 10)
  WHEN trim("person") <> ''
    THEN 'name:' || lower(regexp_replace(trim("person"), '[[:space:]]+', ' ', 'g')) || '|company:' || lower(regexp_replace(trim("company"), '[[:space:]]+', ' ', 'g'))
  ELSE ''
END;
