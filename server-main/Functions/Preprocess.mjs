import ExpandedReplacements from './ExpandedReplacements.mjs';

// Updated regex to match a wider range of emoticons
const emoticonRegex = /[:;=X8][-']?[()DOPp\[\]\/\\{}|@<>3]|<3/g;

// New regex to match words with repeated characters
const repeatedCharRegex = /(.)\1{2,}/g;

function Preprocess(text) {
  // Split the text into words and emoticons
  const tokens = text.split(/\s+/).map((token) => {
    // If the token is an emoticon, return it as is
    if (emoticonRegex.test(token)) {
      console.log("Emoticon token : ",token)
      return ExpandedReplacements[token]||token;
    }

    // If the token has repeated characters, reduce them to maximum two
    let processedToken = token.replace(repeatedCharRegex, '$1$1');

    // Apply replacements (e.g., slang to standard forms)
    processedToken =
      ExpandedReplacements[processedToken.toLowerCase()] || processedToken;

    return processedToken;
  });

  const processedText = tokens.join(' ');
  console.log(processedText);

  return processedText;
}

export default Preprocess;
