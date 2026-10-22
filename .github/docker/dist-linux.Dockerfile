# the image of the Linux dist job (.github/workflows/dist-image.yml builds it): the packaging tools and the Flatpak runtime of dist.yml, which took minutes to install on every run
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# flatpak and flatpak-builder package the bundle, libarchive-tools is needed by dist, xvfb and dbus run the smoke tests, the rest is what electron needs to start
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential ca-certificates curl dbus flatpak flatpak-builder git libarchive-tools python3 sudo xvfb xz-utils \
    libasound2t64 libatk-bridge2.0-0t64 libdrm2 libfuse2t64 libgbm1 libgtk-3-0t64 libnss3 libxkbcommon0 libxss1 libxtst6 \
  && rm -rf /var/lib/apt/lists/*

# electron-builder bundles the flatpak from the runtime, the sdk and the base app, which it does not download itself (versions as in the flatpak config of package.json)
RUN flatpak remote-add --system --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo \
  && flatpak install --system --noninteractive flathub org.freedesktop.Platform//25.08 org.freedesktop.Sdk//25.08 org.electronjs.Electron2.BaseApp//25.08
