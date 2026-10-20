export function restoreManifestSql(tables, schema = "labor_staging_ci") {
  if (!Array.isArray(tables) || !tables.length || !/^[A-Za-z0-9_]+$/.test(schema) || tables.some(table => typeof table !== "string" || !/^[A-Za-z0-9_]+$/.test(table))) throw new Error("Restore manifest requires valid schema and table identifiers.");
  return tables.map(table => `SELECT '${table}', count(*), md5(coalesce(string_agg(row_to_json(ROW(restore_manifest_row.*))::text, E'\\n' ORDER BY row_to_json(ROW(restore_manifest_row.*))::text), '')) FROM "${schema}"."${table}" AS restore_manifest_row;`).join("\n");
}
