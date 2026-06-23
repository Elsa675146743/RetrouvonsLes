/**
 * @format
 */
import 'react-native-url-polyfill/auto';
import { fetch, Headers, Request, Response } from 'cross-fetch';
global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
AppRegistry.registerComponent(appName, () => App);