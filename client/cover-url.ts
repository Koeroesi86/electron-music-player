/** The URL of the optimized cover the local server generates for a stored album picture */
export const getCoverUrl = (port: string, picture: string) => {
  const cover = (picture.split(/[\\/]/).pop() ?? '').replace(/\.[^.]*$/, '');
  return `http://127.0.0.1:${port}/albumart/${cover}-optimized.png`;
};
