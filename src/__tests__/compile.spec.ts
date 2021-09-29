import { testGenerate } from '@openapi-generator-plus/generator-common/dist/testing'
import { build, prepare, DEFAULT_CONFIG } from './common'
import fs from 'fs'
import path from 'path'
import { configObject } from '@openapi-generator-plus/generator-common'

describe('compile test cases', () => {
	function compileFiles(basePath: string, files: string[]) {
		for (const file of files) {
			test(file, async() => {
				const result = await prepare(path.join(basePath, file), {
					...DEFAULT_CONFIG,
					npm: {
						...configObject(DEFAULT_CONFIG, 'npm', {}),
						name: path.basename(file),
					},
					includeTests: true,
				})
				await testGenerate(result, { postProcess: build, testName: file, clean: false })
			})
		}
	}

	const basePath = path.join(__dirname, '..', '..', '__tests__', 'specs')
	if (fs.existsSync(basePath)) {
		compileFiles(basePath, fs.readdirSync(basePath))
	}

	const sharedBasePath = path.join(__dirname, '../../../openapi-generator-plus-generators/__tests__/specs')
	if (fs.existsSync(sharedBasePath)) {
		compileFiles(sharedBasePath, fs.readdirSync(sharedBasePath))
	}
})
