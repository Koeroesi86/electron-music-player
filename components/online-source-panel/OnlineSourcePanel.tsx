import style from './OnlineSourcePanel.scss';

function OnlineSourcePanel({ src = 'about:blank' }: { src?: string }) {
  return <webview className={style.webviewPanel} src={src} disablewebsecurity webpreferences={'webSecurity'} />;
}

export default OnlineSourcePanel;
