import type { CSSProperties } from 'react'
import type { PageLocals } from '../index-page/Index'
import loading from './assets/loading.svg'

const style: Record<'body' | 'container' | 'wrapper' | 'text', CSSProperties> = {
  body: {
    backgroundColor: 'transparent'
  },
  container: {
    WebkitAppRegion: 'drag',
    WebkitUserSelect: 'none',
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'sans-serif',
    color: '#ffffff',
    borderRadius: '6px'
  },
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  text: {
    marginTop: '20px',
    textAlign: 'center',
    fontWeight: '100'
  }
}

function LoadingSplash (props: { locals: Pick<PageLocals, 'title'> }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <title>{props.locals.title}</title>
      </head>
      <body style={style.body}>
        <div style={style.container}>
          <div style={style.wrapper}>
            <img src={loading} />
            <div style={style.text}>{props.locals.title} is loading...</div>
          </div>
        </div>
      </body>
    </html>
  )
}

export default LoadingSplash
