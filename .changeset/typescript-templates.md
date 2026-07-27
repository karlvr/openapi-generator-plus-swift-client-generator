---
"@openapi-generator-plus/swift-client-generator": major
---

Replace the Handlebars templates with TypeScript templates.

Templates are now TypeScript code built on the
`@openapi-generator-plus/template-utils` package (the `ts` tagged template with
its SKIP/when/maybe/each/join helpers), giving template development type-safety
against the codegen document model, ordinary code navigation and refactoring,
and testability. Generated output is byte-identical to the previous Handlebars
output (trailing whitespace on a line is no longer emitted), verified across the
full test-spec corpus during the migration.

Breaking changes:

- The `customTemplates` config option is removed. Templates are TypeScript
  code; a child generator customizes the output through the typed template
  functions exported from this package. Setting `customTemplates` now logs a
  warning and has no effect.
- The Handlebars-based extension hooks are removed from `SwiftGeneratorContext`:
  `loadAdditionalTemplates`, `additionalWatchPaths` and
  `additionalExportTemplates`. A child generator emits extra files via the new
  `exportFiles` hook instead.
- The `handlebars` and `@openapi-generator-plus/handlebars-templates`
  dependencies are dropped.

Fixes:

- A top-level wrapper schema now generates a source file. Previously the
  generator asked for a `wrapper` template that didn't exist and failed with
  "Unknown template: wrapper"; only the nested form of the template was
  present.
- A wrapper's optional property now defaults to its initial value's literal
  rather than to the stringified `CodegenValue` object.
