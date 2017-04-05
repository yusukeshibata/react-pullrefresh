import React, { PropTypes, Component } from 'react'
import { findDOMNode } from 'react-dom'
import defaultStyle from './style'
import AnimationFrame from './animationframe'
import ScrollElement from './scroll'
import transform from './transform'
import { Div, Svg, Circle, Path } from './components'
const global = global || window

const STROKEDASHARRAY = [Math.PI * 8]

export default class PullRefresh extends Component {
  constructor(props) {
    super(props)
    this.state = {
      y: 0,
      step: 0,
      r: 0,
      width: 0
    }
    this._y = 0
    this._cnt = 0
    this._step = 0
    this._touch = false
    this._lock = false
    this._loop = this._loop.bind(this)
    this._scrollElement = new ScrollElement()
    this.onTouchStart = this.onTouchStart.bind(this)
    this.onTouchEnd = this.onTouchEnd.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.onStep = this.onStep.bind(this)
    this._animator = new AnimationFrame()
    this._animator.on('frame', this._loop)
  }
  _loop() {
    const { r, loading } = this.state
    if(this._step <= 0) {
      this._lock = false
      this._animator.stop()
      return
    }
    if(loading) {
      this.setState({
        r:  r + Math.PI * 2 / 60 / 1.4
      })
    } else {
      const nextStep = this._step * 0.8
      this._step = Math.floor(nextStep)
      this.onStep(this._step)
    }
  }
  abort() {
    this._lock = false
    this._cnt = 0
    this._step = 0
    this._touch = false
  }
  onPull(step, next) {
    const { max, onRefresh } = this.props
    const that = this
    if(!onRefresh || step * 0.6 < max) {
      next()
      return
    }
    that.setState({
      loading:true
    })
    onRefresh(_ => {
      that.setState({
        loading:false
      })
      next()
    })
    next()
  }
  pull(step) {
    if(this._lock) return

    this._cnt = 3
    this._step = step
    this.onStep(this._step)
    this._lock = true
    this.onPull(this._step, () => {
      this._touch = true
      this._animator.start()
    })
  }
  onTouchStart(evt) {
    const { disabled } = this.props
    if(disabled) return
    if(this._lock) return
    this._y = evt.nativeEvent.touches ? evt.nativeEvent.touches[0].pageY : evt.nativeEvent.pageY
    this._started = false
    this._cnt = 0
    this._step = -this._scrollElement.scrollTop
    this._touch = true
  }
  onTouchEnd(evt) {
    const { disabled } = this.props
    if(disabled) return
    if(this._lock) return
    let that = this
    that._started = false
    that._lock = true
    that.onPull(that._step, () => {
      that._touch = false
      this._animator.start()
    })
    return true
  }
  onTouchMove(evt) {
    const { disabled } = this.props
    if(disabled) return
    if(this._lock) return
    let y = evt.nativeEvent.touches ? evt.nativeEvent.touches[0].pageY : evt.nativeEvent.pageY
    let step = this._touch ? this._step + y - this._y : 0
    if(this._touch && step !== this._step) {
      this._cnt++
      this._step = step
      this._y = y
      if(this._cnt === 2 && this._scrollElement.scrollTop === 0) {
        //this._emitter.emit('start')
        this._started = true
      }
      if(this._started) {
        this.onStep(Math.max(0, this._step))
      }
    }
  }
  refresh() {
    const { max } = this.props
    this.pullhelper.pull(max / 0.6 + 1)
  }
  onStep(step) {
    this.setState({ step })
  }
  componentDidMount() {
    this.updateChildren()
  }
  componentWillReceiveProps(nextProps, nextState) {
    this.updateChildren(nextProps)
  }
  shouldComponentUpdate(nextProps, nextState) {
    const currentProps = this.props
    const currentState = this.state
    return false
      || nextState.r !== currentState.r
      || nextState.children !== currentState.children
      || nextState.loading !== currentState.loading
      || nextState.step !== currentState.step
      || nextProps.offset !== currentProps.offset
      || nextProps.zIndex !== currentProps.zIndex
      || nextProps.max !== currentProps.max
      || nextProps.color !== currentProps.color
      || nextProps.size !== currentProps.size
      || nextProps.style !== currentProps.style
  }
  updateChildren(nextProps) {
    const currentProps = this.props
    if(
      !nextProps ||
      nextProps.children &&
      nextProps.children !== currentProps.children
    ) {
      const props = nextProps || currentProps
      this.setState({
        children: React.cloneElement(React.Children.only(props.children), {
          ref: c => this._scrollElement.element = c,
          onTouchStart: this.onTouchStart,
          onTouchMove: this.onTouchMove,
          onTouchEnd: this.onTouchEnd,
          onMouseDown: this.onTouchStart,
          onMouseMove: this.onTouchMove,
          onMouseLeave: this.onTouchEnd,
          onMouseUp: this.onTouchEnd,
          onScroll: this._scrollElement.onScroll
        })
      })
    }
  }
  render() {
    const { offset, zIndex, max, color, style, size } = this.props
    const { r, width, step, loading, children } = this.state
    const top = Math.min(step * 0.6, max) - size - 6
    const scale = Math.min(1, step / max)
    return (
      <Div style={{
        ...style,
        ...defaultStyle.container
      }}>
        { children }
        { step > 0 &&
            <Div style={{
              ...defaultStyle.component,
              width: size,
              height: size,
              borderRadius: size / 2,
              zIndex: zIndex,
              padding: (size - 30) / 2,
              top: offset + top,
              transform: transform([
                { scaleX: scale },
                { scaleY: scale }
              ])
            }}>
              <Svg
                style={{
                  transform: transform([
                    { rotate: `${(loading ? r  : step / max) * 360}deg` }
                  ])
                }}
                width={30}
                height={30}
                viewBox='0 0 30 30'
              >
                { !this._lock && !loading &&
                    <Path
                      fill={color}
                      d='M13.3,15L7.1,8.9L0.9,15'
                    />
                }
                <Circle
                  style={{
                    transformOrigin: 'center'
                  }}
                  stroke={color}
                  strokeDasharray={STROKEDASHARRAY}
                  strokeDashoffset={ loading ? r : 0}
                  fill='none'
                  strokeWidth={2}
                  cx={15}
                  cy={15}
                  r={8}
                />
              </Svg>
            </Div>
        }
      </Div>
    )
  }
}

PullRefresh.propTypes = {
  offset: PropTypes.number,
  size: PropTypes.number,
  max: PropTypes.number,
  style: PropTypes.object,
  color: PropTypes.string
}

PullRefresh.defaultProps = {
  color: '#000000',
  offset: 0,
  size: 40,
  max: 100,
  style: {}
}
