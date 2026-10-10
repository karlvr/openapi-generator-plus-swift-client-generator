import { promises as fs } from 'fs'
import * as path from 'path'
import type { ConformanceDriver } from '@openapi-generator-plus/client-conformance/dist/drivers'
import { run, shellArgument } from '@openapi-generator-plus/client-conformance/dist/drivers'

/** The executable target that holds the driver. */
const DRIVER_TARGET = 'ConformanceDriver'

/** The file that holds the scaffold that each suite's entry file builds on. */
const HARNESS = 'harness.swift'

/**
 * The conformance driver for a generated Swift package.
 *
 * The driver is an executable target that `install` adds to the package's manifest, and that
 * depends on the generated library. So `swift build` checks the driver against the generated API.
 * The suite's entry file in this directory, named after the suite id, becomes the target's
 * `main.swift`.
 *
 * The package builds in the Swift 6 language mode, so the driver also proves that a caller can make
 * these calls under strict concurrency checking. The generated package must be named `TestModule`.
 */
export const swiftDriver: ConformanceDriver = {
	name: 'swift',
	async install(basePath, suite) {
		const target = path.join(basePath, 'Sources', DRIVER_TARGET)
		await fs.mkdir(target, { recursive: true })
		await fs.copyFile(path.join(__dirname, HARNESS), path.join(target, HARNESS))
		await fs.copyFile(path.join(__dirname, `${suite.id}.swift`), path.join(target, 'main.swift'))

		/* A manifest is Swift code, so a statement at its end can add a target to the package */
		await fs.appendFile(path.join(basePath, 'Package.swift'), `
package.targets.append(.target(name: "${DRIVER_TARGET}", dependencies: [.target(name: package.name)]))
`)
	},
	async run(basePath, _suite, baseUrl, resultsPath) {
		await run(`swift run -Xswiftc -swift-version -Xswiftc 6 ${DRIVER_TARGET} ${shellArgument(baseUrl)} ${shellArgument(resultsPath)}`, basePath)
	},
}
