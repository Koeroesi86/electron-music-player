# eMusic

Open-Source Lossless Audio Player

* [![Build](https://github.com/Koeroesi86/electron-music-player/actions/workflows/build.yml/badge.svg)](https://github.com/Koeroesi86/electron-music-player/actions/workflows/build.yml)


### Install

Download the installer of your system from the [latest release](https://github.com/Koeroesi86/electron-music-player/releases/latest); the app updates itself on start. On Linux the AppImage needs FUSE: the kernel support and a `fusermount3` helper, which the `fuse3` package provides and desktop installs have. v26.10.2 and older also need FUSE 2 (`sudo dnf install fuse-libs` on Fedora, `sudo apt install libfuse2t64` on Ubuntu 24.04); without it nothing opens and the reason only shows when the AppImage is started from a terminal. Without FUSE it runs with `APPIMAGE_EXTRACT_AND_RUN=1 ./eMusic-<version>.AppImage`.


### Deving and Building

| Command            | Purpose                              |
| :----------------- | :----------------------------------- |
| `npm run dev`      | Start development server             |
| `MOCK_UPDATE=1 npm run dev` | Development server with a mocked update on the splash (nothing is installed) |
| `npm run build`    | Compile the app to `/out` and `/build`. |
| `npm run typecheck`| Type-check the whole project         |
| `npm run dist`     | Build for current OS                 |
