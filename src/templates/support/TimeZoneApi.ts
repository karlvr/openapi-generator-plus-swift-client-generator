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
    /// The offset of the time zone, as RFC 3339 writes it: "Z" for UTC, otherwise the sign, hours and minutes.
    var apiTimeZoneString: String {
        var seconds = secondsFromGMT()
        if seconds == 0 {
            return "Z"
        }
        let prefix = seconds < 0 ? "-" : "+"
        seconds = abs(seconds)
        let hours = seconds / 3600
        let minutes = (seconds - (hours * 3600)) / 60

        return String(format: "\\(prefix)%02d:%02d", hours, minutes)
    }
}
`
}
