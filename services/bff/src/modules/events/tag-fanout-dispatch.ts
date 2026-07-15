/** Decide publish path for tag fan-out (pure; unit-tested). */
export type TagFanoutDispatch =
  | { mode: 'rmq' }
  | { mode: 'http-fallback' }
  | { mode: 'noop' };

export function chooseTagFanoutDispatch(input: {
  addedTagIds: ReadonlyArray<string>;
  rmqPublished: boolean;
}): TagFanoutDispatch {
  if (!input.addedTagIds.length) return { mode: 'noop' };
  if (input.rmqPublished) return { mode: 'rmq' };
  return { mode: 'http-fallback' };
}
