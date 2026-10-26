# eMusic

Open-Source Lossless Audio Player

* [![Build](https://github.com/Koeroesi86/electron-music-player/actions/workflows/build.yml/badge.svg)](https://github.com/Koeroesi86/electron-music-player/actions/workflows/build.yml)


### Install

Download the installer of your system from the [latest release](https://github.com/Koeroesi86/electron-music-player/releases/latest); the app updates itself on start. On Linux the downloaded AppImage has to be made executable first: `chmod +x eMusic-<version>.AppImage`, then `./eMusic-<version>.AppImage` (or tick "Allow executing as a program" in the file manager). It needs FUSE 3: the kernel support and a `fusermount3` helper, which the `fuse3` package provides and desktop installs have. Without FUSE it runs with `APPIMAGE_EXTRACT_AND_RUN=1 ./eMusic-<version>.AppImage`. v26.10.2 and older also need FUSE 2 (`sudo dnf install fuse-libs` on Fedora, `sudo apt install libfuse2t64` on Ubuntu 24.04); without it nothing opens and the reason only shows when the AppImage is started from a terminal.


### Window blur

The parts of the window that are translucent (the side panel, the title bar and, with a blur, the track list and the controls) show a blurred backdrop where the system provides one:

| System | Blur behind the window |
| :----- | :--------------------- |
| macOS | Built in (vibrancy), nothing to set up. |
| Windows | Not available yet; the window gets a darker, more opaque tint. |
| GNOME on Linux | Through the [Blur my Shell](https://extensions.gnome.org/extension/3193/blur-my-shell/) extension, see below. |
| Other Linux desktops | Only if the desktop blurs windows itself (for example a KDE Plasma blur rule); the app cannot ask for it. |

Electron cannot blur behind a window on Linux and the app cannot tell whether the desktop does, so it starts with the darker tint. Start it with `EMUSIC_BLUR=1` (`EMUSIC_BLUR=1 ./eMusic-<version>.AppImage`) once the desktop blurs it, and the translucent look is used.

#### GNOME with Blur my Shell

1. Install Blur my Shell from [extensions.gnome.org](https://extensions.gnome.org/extension/3193/blur-my-shell/) or the Extension Manager app, and turn it on.
2. In its preferences, open the **Applications** tab and turn on **Blur all windows** (or add `eMusic` to the whitelist; the window class is `eMusic`, `emusic-dev` for a development run).
3. Turn off **Opaque focused window**. Left on, the extension blurs only windows that are not focused, so eMusic would show no blur while you use it.
4. Leave **Opacity** at 255: the extension then keeps the window's own transparency and the blur shows through the translucent parts. Lower values make the whole window, panels included, more see-through.
5. Start eMusic with `EMUSIC_BLUR=1`. To get it from the app menu, add `Exec=env EMUSIC_BLUR=1 ...` to your copy of the desktop entry.

Tested with Blur my Shell 76 on GNOME 50 (Wayland). Without the extension, GNOME draws nothing behind the window, so leave `EMUSIC_BLUR` unset there.

### Deving and Building

| Command            | Purpose                              |
| :----------------- | :----------------------------------- |
| `npm run dev`      | Start development server             |
| `MOCK_UPDATE=1 npm run dev` | Development server with a mocked update on the splash (nothing is installed) |
| `npm run build`    | Compile the app to `/out` and `/build`. |
| `npm run typecheck`| Type-check the whole project         |
| `npm run dist`     | Build for current OS                 |
