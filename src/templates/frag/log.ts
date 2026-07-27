/** A conditional logging statement, guarded by the configuration's logging flag. */
export function log(options: { level: string; msg: string; condition?: string }): string {
	const condition = options.condition ?? 'configuration.loggingEnabled'
	return `if ${condition} { logger.${options.level}("${options.msg}") }`
}
