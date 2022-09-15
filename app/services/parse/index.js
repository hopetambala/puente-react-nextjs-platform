import { Parse } from 'parse';

const initialize = () => {
  Parse.initialize(
    process.env.NEXT_PUBLIC_parseAppId,
    process.env.NEXT_PUBLIC_parseJavascriptKey
  );
  Parse.serverURL = process.env.NEXT_PUBLIC_parseServerUrl;
  console.log(
    `Initialize Parse with App ID: ${process.env.NEXT_PUBLIC_parseAppId}, Javascript Key: ${process.env.NEXT_PUBLIC_parseJavascriptKey}`
  ); // eslint-disable-line
};

const parseService = {
  initialize,
};

export default parseService;
