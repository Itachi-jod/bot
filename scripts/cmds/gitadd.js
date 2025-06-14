const axios = require('axios');

module.exports = {
  config: {
    name: 'gitadd',
    version: '1.0',
    author: 'MinatoCodes',
    role: 2,
    description: {
      en: 'Install command directly in GitHub repository',
    },
    category: 'owner',
    guide: {
      en: '{pn} install <filename> <content>: Install a command file with provided content\n{pn} install <code link>: Install a command file from a code link (e.g., Pastebin)',
    },
  },

  onStart: async ({ args, message }) => {
    if (args[0] !== 'install') {
      return message.SyntaxError();
    }

    if (args.length < 3) {
      return message.reply('⚠️ Please provide both filename and content or a valid code link.');
    }

    const fileName = args[1];
    // Basic filename validation
    if (!fileName.match(/^[a-zA-Z0-9_-]+\.(js|txt)$/)) {
      return message.reply('⚠️ Invalid filename. Use alphanumeric characters and .js or .txt extension.');
    }

    const content = args.slice(2).join(' ');
    
    try {
      if (content.startsWith('http://') || content.startsWith('https://')) {
        const response = await axios.get(content);
        if (!response.data) {
          throw new Error('Empty content received from link');
        }
        await installScript(fileName, response.data, message);
      } else {
        await installScript(fileName, content, message);
      }
    } catch (error) {
      console.error('Error in onStart:', JSON.stringify(error, null, 2));
      return message.reply(`❌ Failed to process content: ${error.message}`);
    }
  },
};

async function installScript(fileName, content, message) {
  const owner = 'Itachi-jod';
  const repo = 'Itachi-jod';
  const token = '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'; // Updated PAT
  const directory = 'scripts/cmds';
  const path = `${directory}/${fileName}`;

  if (!token) {
    return message.reply('❌ GitHub token is missing.');
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    // Check if file exists to get SHA for update
    let sha = null;
    try {
      const getResponse = await axios.get(apiUrl, { headers });
      sha = getResponse.data.sha;
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error; // Rethrow if not a "file not found" error
      }
    }

    // Prepare content for GitHub API (base64 encoded)
    const encodedContent = Buffer.from(content).toString('base64');
    
    // Create or update file
    const payload = {
      message: `Add or update ${fileName} via bot`,
      content: encodedContent,
      branch: 'main', // Adjust branch name if needed
    };
    if (sha) {
      payload.sha = sha; // Include SHA for updates
    }

    const response = await axios.put(apiUrl, payload, { headers });

    if (response.status === 200 || response.status === 201) {
      return message.reply(`✅ Successfully installed "${fileName}" to GitHub repository.`);
    } else {
      return message.reply(`❌ Failed to install "${fileName}": Unexpected response status ${response.status}`);
    }
  } catch (error) {
    console.error('Installation error:', JSON.stringify(error.response?.data || error, null, 2));
    const errorMessage = error.response?.data?.message || error.message;
    return message.reply(`❌ Error installing "${fileName}": ${errorMessage}`);
  }
}
