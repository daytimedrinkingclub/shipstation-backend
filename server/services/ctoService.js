const {
  fileCreatorTool,
  taskAssignerTool,
  deployProjectTool,
  searchTool,
} = require("../config/tools");
const { handleCTOToolUse } = require("../controllers/ctoToolController");
require("dotenv").config();

const systemPrompt = `

  < These are the development guidelines to be always followed strictly. >
  Structure the given project into web components for use in a simple localhost environment.
  Use vanilla JavaScript and avoid any module syntax or bundlers.
  Ensure all components are globally accessible.
  Use Tailwind CSS via CDN and Font Awesome for icons.
  < End of guidelines >

  Here are the exact steps and the order of development to be followed:

  Here are the exact steps and the order of development to be followed:

  0. Plan the overall structure of the application, identifying necessary components.
  
  1. Create an index.html file that includes all necessary script tags for components.
  
  2. For each component:
     a. Create a <component-name>.js file in the components folder.
     b. Ensure each component file defines a global class.
     c. Include a script tag for each component in index.html.
  
  3. In index.html, after all component scripts, include a main.js file that defines all custom elements.
  
  4. Ensure all files are properly linked in the index.html.

  < Start of file structure example >
  1. project-root/
     1.1. index.html
     1.2. components.js
     1.3. main.js (optional)
     1.4. components/
          1.4.1. header-component.html
          1.4.2. header-component.js
          1.4.3. hero-section.html
          1.4.4. hero-section.js
          1.4.5. ... (other component files)
  < End of file structure example >

  < Start of limitations >
  Never:
  1. Never use React or any other frontend framework
  2. Never use shadow DOM
  3. Never create separate CSS files or tailwind.config.js file
  4. Restrict the project's structure beyond the given guidelines
  < End of limitations >
  `;

async function ctoService({ query, projectFolderName, sendEvent, client }) {
  console.log("aiAssistance called with query:", query);

  const messages = [{ role: "user", content: [{ type: "text", text: query }] }];

  try {
    let msg = await client.sendMessage({
      messages,
      system: systemPrompt,
      tools: [fileCreatorTool, taskAssignerTool, deployProjectTool, searchTool],
    });
    while (msg.stop_reason === "tool_use") {
      const tool = msg.content.find((content) => content.type === "tool_use");
      if (tool) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
        console.log("Found cto tool use in response:", tool);
        const toolResult = await handleCTOToolUse({
          tool,
          projectFolderName,
          sendEvent,
          client,
        });
        messages.push({ role: "user", content: toolResult });
        console.log(
          "Sending request to Anthropic API with updated messages:",
          JSON.stringify(messages)
        );

        msg = await client.sendMessage({
          system: systemPrompt,
          tools: [fileCreatorTool, taskAssignerTool, deployProjectTool],
          messages,
        });

        console.log("Received response from Anthropic API:", msg);
      } else {
        console.log("No tool use found in response, breaking loop");
        break;
      }
    }
    const slug = projectFolderName;
    sendEvent("websiteDeployed", {
      slug,
    });
    client.abortRequest();
    return {
      message: `Website successfully built with  slug: ${slug}`,
      slug,
    };
  } catch (error) {
    console.error("Error in aiAssistance:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

module.exports = {
  ctoService,
};
