# Triaging Plugin

A comprehensive Chrome extension designed to streamline bug triaging workflows for developers and QA engineers. This extension provides automated tagging, whiteboard management, and enhanced user interface for efficient bug tracking and resolution.

## 🌟 Features

### 🎨 **Modern UI with Dark Mode**
- **Automatic Theme Detection**: Adapts to your system's light/dark mode preference
- **Manual Theme Toggle**: Override system preference via settings
- **Professional Design**: Clean, modern interface with smooth animations
- **Responsive Layout**: Optimized for various screen sizes

### 🐛 **Bug Management**
- **Bug ID Display**: Click-to-copy bug identification with visual feedback
- **Age Tracking**: Real-time bug age calculation with color-coded indicators
- **Whiteboard Integration**: Seamless interaction with Bugzilla whiteboard fields

### 🏷️ **Advanced Tagging System**
- **Predefined Tags**: Extensive collection of categorized bug tags
- **Smart Search**: Real-time tag filtering and search functionality
- **Frequent Tags**: Learning system that remembers your most-used tags
- **Custom Tags**: Add custom tags on-the-fly
- **Tag Management**: Remove unwanted tags with visual feedback

### ⚙️ **Professional Settings**
- **Modal Settings Panel**: Clean, organized settings interface
- **Theme Controls**: Easy dark/light mode switching
- **Persistent Preferences**: Settings saved across browser sessions
- **Intuitive Controls**: Toggle switches and clear visual feedback

### 📊 **ETA Management**
- **Business Days Calculator**: Automatic ETA calculation excluding weekends
- **Visual Slider**: Intuitive ETA selection with business day awareness
- **Triaged Tracking**: Automatic triaged date stamping

## 🚀 Installation

### Prerequisites
- Google Chrome browser (version 88 or later)
- Access to Bugzilla instance (tested with blrbugzilla.yodlee.com)

### Installation Steps

1. **Download the Extension**
   ```bash
   git clone https://github.com/vallimuthuraja-git/Triage-plugin-.git
   cd Triage-plugin-
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `Triage-plugin-` folder

3. **Verify Installation**
   - Look for the extension icon in Chrome toolbar
   - Click the icon to open the popup interface

## 📖 Usage Guide

### Basic Workflow

1. **Navigate to Bug Page**
   - Open any bug in Bugzilla
   - Click the Triaging Plugin icon in the toolbar

2. **Automatic Data Loading**
   - Bug ID and age are automatically detected and displayed
   - Whiteboard content is loaded from the page

3. **Add Tags**
   - Browse categorized tag sections (Status, MFA Issues, Special Issues, Tool Issues)
   - Use the search bar to find specific tags quickly
   - Click any tag button to add it to your whiteboard

4. **Manage Whiteboard**
   - View combined tags (original + added) in real-time
   - Remove unwanted tags by clicking the × button
   - Use "Execute" to apply all changes to the bug page

5. **Set ETA**
   - Use the business days slider to set expected resolution dates
   - Automatic triaged date stamping included

### Advanced Features

#### Theme Customization
- Click the gear icon (⚙) in the top right
- Toggle dark mode on/off
- Settings persist across browser sessions

#### Tag Management
- **Frequent Tags**: Most-used tags appear at the top for quick access
- **Search Functionality**: Type to filter tags in real-time
- **Custom Tags**: Search for non-existent tags to create custom ones

#### Keyboard Shortcuts
- Click on Bug ID or Age displays to copy to clipboard
- Visual feedback confirms successful copying

## 🏗️ Technical Architecture

### File Structure
```
Triage-plugin-/
├── manifest.json          # Extension manifest and permissions
├── popup.html            # Main popup interface
├── popup.css             # Styling and themes
├── popup.js              # Popup initialization and data handling
├── clickEvents.js        # User interaction handlers
├── content1.js           # Page content script for Bugzilla integration
├── background.js         # Background service worker
├── jquery.js             # jQuery library for DOM manipulation
├── logo.png              # Extension icon
└── README.md             # This documentation
```

### Key Technologies
- **Chrome Extension APIs**: Manifest V3, Storage, Scripting, Tabs
- **JavaScript/jQuery**: DOM manipulation and event handling
- **CSS Custom Properties**: Dynamic theming system
- **HTML5**: Semantic markup and accessibility

### Browser Permissions
- `activeTab`: Access current tab for data extraction
- `storage`: Save user preferences and tag usage data
- `scripting`: Inject scripts for whiteboard interaction

## 🎨 Customization

### Theme Variables
The extension uses CSS custom properties for easy theming:

```css
:root {
  --bg-primary: #f9f9f9;      /* Main background */
  --bg-secondary: #ffffff;    /* Card/component backgrounds */
  --bg-tertiary: #f8fafc;     /* Subtle highlights */
  --text-primary: #333333;    /* Main text */
  --text-secondary: #666666;  /* Secondary text */
  --text-accent: #2563eb;     /* Links and accents */
  --border-primary: #e2e8f0;  /* Main borders */
  --button-primary: #007bff;  /* Primary buttons */
  --success: #28a745;         /* Success states */
  --error: #dc3545;           /* Error states */
  --warning: #ffc107;         /* Warning states */
}
```

### Adding Custom Tags
Modify the `tagGroups` object in `clickEvents.js` to add new tag categories:

```javascript
const tagGroups = {
  custom: {
    label: 'Custom Tags',
    buttons: [
      { id: 'custom_tag_1', text: 'Custom Tag 1' },
      { id: 'custom_tag_2', text: 'Custom Tag 2' }
    ]
  }
};
```

## 🐛 Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure Developer Mode is enabled in `chrome://extensions/`
- Check that all files are present in the extension folder
- Try reloading the extension

**Tags not applying:**
- Verify you're on a Bugzilla bug page
- Check that the whiteboard field is accessible
- Ensure "JN_TRIAGED" keyword is present for execution

**Theme not switching:**
- Clear browser cache and reload extension
- Check Chrome storage permissions
- Try toggling theme multiple times

**Search not working:**
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the popup

### Debug Mode
Enable verbose logging by opening Chrome DevTools on the popup and checking the console for error messages.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and naming conventions
- Test changes across different Bugzilla instances
- Ensure accessibility compliance (WCAG 2.1)
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Vallimuthu Raja**
- GitHub: [@vallimuthuraja-git](https://github.com/vallimuthuraja-git)
- Contact: For support or suggestions, see contact info in settings

## 🙏 Acknowledgments

- Built for the Yodlee QA team to improve bug triaging efficiency
- Inspired by modern web application design principles
- Thanks to the Chrome Extensions community for documentation and examples

---

**Version 2.0** - Complete UI redesign with dark mode and professional settings panel.
