import { types } from 'pg';

// pg parses the `date` OID (1082) into a JS Date, which cannot represent BCE
// dates faithfully ("0500-01-01 BC" becomes year -499 and is re-stringified
// by TypeORM as "-499-01-01"). Keep the raw PostgreSQL text so
// periodDateTransformer can convert it to the canonical "-0500-01-01" form.
types.setTypeParser(1082, (value: string) => value);

export {};
