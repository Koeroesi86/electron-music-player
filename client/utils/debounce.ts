/** Run the callback once the calls have stopped for the delay, with the arguments of the last call */
export const debounce = <Args extends unknown[]>(callback: (...args: Args) => void, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);

  return debounced;
};
