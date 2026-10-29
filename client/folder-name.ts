/** Split a folder path into its own name and the folder it sits in, for both kinds of separator */
export const splitFolderPath = (folderPath: string) => {
  const trimmed = folderPath.replace(/[\\/]+$/, '');
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  const name = trimmed.slice(cut + 1);

  return name ? { name, parent: trimmed.slice(0, cut + 1) } : { name: folderPath, parent: '' };
};
