# App Icon Setup for TracerConnect Mobile

## Quick Setup

1. **Add your icon source**  
   Place a 1024×1024 PNG version of the TracerConnect logo at:
   ```
   assets/icon/icon.png
   ```
   (You can convert the SVG logo from `../web/public/logo.svg` using any SVG→PNG tool)

2. **Install dependencies & generate icons**
   ```bash
   cd mobile
   flutter pub get
   flutter pub run flutter_launcher_icons:main
   ```

3. **Verify**  
   - Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - iOS: `ios/Runner/Assets.xcassets/AppIcon.appiconset/`

## Icon Design Notes

The logo uses:
- **Background**: Indigo→Blue→Cyan gradient (`#1e3a8a` → `#3b82f6` → `#06b6d4`)
- **Accent**: Amber/Gold gradient (`#fbbf24` → `#f59e0b`)
- **Symbol**: Connection network (9 nodes representing alumni connections)
- **Safe area**: Keep main symbol within 60% center (768×768px) for adaptive icons

## Alternative: Manual Generation

If you prefer manual control, use these tools:
- **Android**: [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
- **iOS**: [App Icon Generator](https://appicon.co/) or Xcode Asset Catalog
- **All platforms**: [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons)

## Adaptive Icon (Android 8+)

The config generates:
- `ic_launcher.png` - Legacy icon
- `ic_launcher_foreground.png` - Foreground layer
- `ic_launcher_background.png` - Background layer (uses gradient)

Background color: `#1e3a8a` (indigo-900)