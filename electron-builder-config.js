/**
 * Electron Builder configuration
 * This centralizes our electron-builder settings in a JavaScript file
 * which gives us more flexibility than YAML
 */
export default {
  directories: {
    output: "dist-electron",
    buildResources: "build"
  },
  appId: "com.stickit.app",
  productName: "StickItBolt",
  publish: [
    {
      provider: "github",
      owner: "quantompop",
      repo: "StickItBolt"
    }
  ],
  files: [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  extraMetadata: {
    main: "dist-electron/main.js"
  },
  mac: {
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    icon: "dist/icons/icon.icns"
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: [
          "x64"
        ]
      }
    ],
    artifactName: "${productName}-Setup-${version}.${ext}",
    icon: "dist/icons/icon.ico"
  },
  linux: {
    target: [
      "AppImage",
      "deb"
    ],
    category: "Utility",
    icon: "dist/icons/icon.png"
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    deleteAppDataOnUninstall: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  asar: true,
  asarUnpack: [
    "**/*.{node,dll,exe}"
  ]
};