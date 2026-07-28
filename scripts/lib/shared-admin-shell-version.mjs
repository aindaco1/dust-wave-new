import { readFile } from "node:fs/promises";

export const sharedAdminShellPackage = JSON.parse(
  await readFile(
    new URL(
      "../../shared/dust-wave-platform/packages/admin-shell/package.json",
      import.meta.url
    ),
    "utf8"
  )
);

export const sharedAdminShellVersion = sharedAdminShellPackage.version;

export function sharedAdminShellImportPattern(moduleName) {
  const escapedModuleName = String(moduleName).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const escapedVersion = String(sharedAdminShellVersion).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  return new RegExp(
    `dust-wave-admin-shell/${escapedModuleName}\\.js\\?v=${escapedVersion}`
  );
}
