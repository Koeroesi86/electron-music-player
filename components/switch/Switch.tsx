import classNames from 'classnames';
import style from './Switch.scss';

interface SwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

/** An on and off switch; the label is for the screen readers, the title of the tile next to it is what is seen */
const Switch = ({ checked, label, onChange }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    className={classNames(style.switch, { [style.on]: checked })}
    onClick={() => onChange(!checked)}
  />
);

export default Switch;
