import { runConformanceTests } from '@openapi-generator-plus/client-conformance/dist/testing'
import { SUITES } from '@openapi-generator-plus/client-conformance/dist/suites'
import createGenerator from '..'
import { DEFAULT_CONFIG } from './common'
import { swiftDriver } from '../../conformance/driver'

for (const suite of SUITES) {
	runConformanceTests({
		createGenerator,
		driver: swiftDriver,
		config: DEFAULT_CONFIG,
		suite,
	})
}
