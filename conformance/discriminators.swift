/*
 * The discriminator conformance driver for the swift-client generator.
 *
 * The suite copies this file into the generated package, so the package's own
 * compiler checks it against the generated types. A base schema that lost its
 * discriminator property then fails the build here, because the driver sets it.
 *
 * A member fixes its own discriminator value, so the driver never sets it.
 *
 * Run it as: swift run ConformanceDriver <baseUrl> <resultsPath>
 */

import Foundation
import TestModule

let harness = ConformanceHarness()
let discriminator = DiscriminatorApi(configuration: Configuration(basePath: harness.baseUrl))

/* SubObject2 takes thisProperty from IndependentObject, and narrows it to false */
await harness.startCase("discriminator-boolean-request")
await harness.call { try await discriminator.discriminatorBooleanSend(request: .subObject2(SubObject2(otherProperty2: "y"))) }

await harness.startCase("discriminator-boolean-response")
await harness.call { try await discriminator.discriminatorBooleanReceive() }

/* The base schema on its own. It declares thisProperty, so a caller can set it and read it. */
await harness.startCase("discriminator-base-standalone")
await harness.call { try await discriminator.discriminatorBase(request: IndependentObject(thisProperty: true, otherProperty2: "z")) }

await harness.startCase("discriminator-string-request")
await harness.call { try await discriminator.discriminatorPet(request: .cat(Cat(name: "mog"))) }

await harness.startCase("discriminator-enum-request")
await harness.call { try await discriminator.discriminatorShape(request: .circle(Circle(label: "round", radius: Decimal(string: "1.5")!))) }

/* A caller can't set petType at all, so the member must write it */
await harness.startCase("discriminator-default-value")
await harness.call { try await discriminator.discriminatorPet(request: .cat(Cat(name: "mog"))) }

/* Lion is a member of two discriminators that disagree on its value, so it keeps a stored property that the caller sets */
await harness.startCase("discriminator-conflicting-values")
await harness.call { try await discriminator.discriminatorFeline(request: .lion(Lion(species: "lion", name: "leo"))) }

await harness.startCase("discriminator-conflicting-values-other")
await harness.call { try await discriminator.discriminatorLegacyFeline(request: .lion(Lion(species: "LION", name: "leo"))) }

try harness.finish()
