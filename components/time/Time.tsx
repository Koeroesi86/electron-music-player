import moment from 'moment';

function Time({ seconds }: { seconds?: number | string | null }) {
  return <span>{moment(Math.floor(parseFloat(`${seconds}`) * 1000), 'x', true).format('HH:mm:ss')}</span>;
}

export default Time;
