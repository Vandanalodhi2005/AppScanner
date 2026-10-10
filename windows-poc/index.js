import { AppRegistry, Platform } from 'react-native';

if (Platform.OS === 'windows') {
  const WindowsPilotApp = require('./src/windowsPilotApp').default;
  AppRegistry.registerComponent('myapp', () => WindowsPilotApp);
} else {
  require('expo-router/entry');
}
