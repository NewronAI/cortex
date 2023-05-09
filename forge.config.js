module.exports = {
  packagerConfig: {
    icon : "images/icon"
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        loadingGif: "images/fidget-spinner.gif",
        setupIcon : "images/icon.ico"
      },
    },
    {
      name: '@electron-forge/maker-zip',
      config: {},
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
