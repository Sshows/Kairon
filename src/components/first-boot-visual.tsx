import "server-only";
import { Folder, MousePointer2, Terminal } from "lucide-react";

export function FirstBootVisual() {
  return (
    <figure
      className="first-boot-visual"
      aria-label="Схема открытия терминала в папке"
    >
      <figcaption>
        Схема действий. Значки и оформление в твоей Kali могут отличаться.
      </figcaption>
      <div className="folder-window">
        <div className="window-label">
          <Folder size={18} aria-hidden="true" /> Файловый менеджер → Videos /
          Видео
        </div>
        <div className="folder-empty-space">
          <span className="visual-step">1</span>
          <p>
            Нажми правой кнопкой <strong>на пустом месте внутри папки</strong>.
          </p>
          <MousePointer2 size={25} aria-hidden="true" />
        </div>
        <div className="folder-context-item">
          <span className="visual-step">2</span>
          <Terminal size={18} aria-hidden="true" />
          <strong>Open Terminal Here</strong>
        </div>
        <p className="visual-caption">
          Выбери «Открыть терминал здесь» в появившемся меню.
        </p>
      </div>
      <div className="terminal-window">
        <div className="window-label">
          <Terminal size={18} aria-hidden="true" /> Новое окно терминала
        </div>
        <p>
          <span className="visual-step">3</span> Введи только <code>pwd</code> и
          нажми Enter.
        </p>
        <pre aria-label="Пример экрана терминала">
          <code>
            {
              "┌──(kali㉿kali)-[~/Videos]\n└─$ pwd\n/home/kali/Videos\n┌──(kali㉿kali)-[~/Videos]\n└─$ ▌"
            }
          </code>
        </pre>
        <p className="visual-caption">
          Строка <code>/home/kali/Videos</code> — пример результата. Последняя
          часть пути должна соответствовать папке, которую ты открыл. Последняя
          строка с курсором ждёт следующую команду.
        </p>
      </div>
    </figure>
  );
}
