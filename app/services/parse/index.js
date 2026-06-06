import { Parse } from 'parse';

let initialized = false;

const initialize = () => {
  if (initialized) return;
  Parse.initialize(process.env.NEXT_PUBLIC_parseAppId, process.env.NEXT_PUBLIC_parseJavascriptKey);
  Parse.serverURL = process.env.NEXT_PUBLIC_parseServerUrl;
  initialized = true;
};

const parseService = {
  initialize,
};

export default parseService;
