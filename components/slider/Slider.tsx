import { PureComponent } from 'react';
import type { ChangeEventHandler, FormEventHandler } from 'react';
import classNames from 'classnames';
import style from './Slider.scss';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  orientation: 'horizontal' | 'vertical';
  value: number;
  onInput: FormEventHandler<HTMLInputElement>;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

class Slider extends PureComponent<SliderProps> {
  // fallow-ignore-next-line unused-class-member -- React reads defaultProps, nothing references it
  static defaultProps = {
    min: 0,
    max: 1,
    step: 0.01,
    orientation: 'horizontal',
    onChange: () => {},
  };

  private slider: HTMLInputElement | null = null;
  private lowerFill: HTMLDivElement | null = null;

  componentDidMount() {
    if (this.slider && this.lowerFill) {
      this.update();
    }
  }

  componentDidUpdate(prevProps: SliderProps) {
    if (this.slider && this.lowerFill && prevProps.value !== this.props.value) {
      this.update();
    }
  }

  update() {
    const { max, value, orientation } = this.props;
    if (!this.slider || !this.lowerFill) return;

    this.slider.value = `${value}`;
    if (orientation !== 'vertical') {
      this.lowerFill.style.width = `${max > 0 ? (value / max) * 100 : 0}%`;
    } else {
      this.lowerFill.style.height = `${max > 0 ? (value / max) * 100 : 0}%`;
    }
  }

  render() {
    const { min, max, step, orientation, onInput, onChange } = this.props;
    return (
      <div
        className={classNames(style.slider, {
          [style.vertical]: orientation === 'vertical',
        })}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          // value={value}
          className={classNames(style.range)}
          onInput={onInput}
          onChange={onChange}
          ref={(s) => {
            this.slider = s;
          }}
        />
        <div
          className={classNames(style.lowerFill)}
          ref={(s) => {
            this.lowerFill = s;
          }}
        />
      </div>
    );
  }
}

export default Slider;
