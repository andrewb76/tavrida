import { Namespace } from '@ory/keto-namespace-types'

class User implements Namespace {}

/** Platform-wide roles — object `platform:tavrida-lot` (see docs/09-security/keto-schema.md). */
class TavridaLot implements Namespace {
  related: {
    admin: User[]
    moderator: User[]
    expert: User[]
    member: User[]
  }
}
