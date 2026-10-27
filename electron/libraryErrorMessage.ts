import type { Translator } from '../locales/translate';
import { NewerLibraryError } from './migrate';

/** What to tell the user when the library could not be opened */
export const libraryErrorMessage = ({ t }: Translator, error: unknown) =>
  error instanceof NewerLibraryError
    ? t('library.error.newer')
    : t('library.error.failed', { message: error instanceof Error ? error.message : String(error) });
