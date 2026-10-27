const maxFieldLength = 2000;

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isField = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= maxFieldLength;

/** The key of a renderer message, anything but plain text fields is dropped */
export const toKey = (payload: unknown) => {
  const { source, kind, id } = isRecord(payload) ? payload : {};

  return isField(source) && isField(kind) && isField(id) ? { source, kind, id } : undefined;
};
