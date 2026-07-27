import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function timeZoneApi(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

extension Foundation.TimeZone {
    var apiTimeZoneString: String {
        var seconds = secondsFromGMT()
        let prefix = seconds < 0 ? "-" : "+"
        seconds = abs(seconds)
        let hours = seconds / 3600
        let minutes = (seconds - (hours * 3600)) / 60

        return String(format: "\\(prefix)%02d:%02d", hours, minutes)
    }
}
`
}
