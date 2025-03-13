/**
 * Markdown to Diagram - Diagram Generator
 * 
 * This module extracts diagram descriptions from markdown files and
 * generates Mermaid diagrams using Claude AI.
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Claude API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Extracts sections containing diagram descriptions from markdown content
 * @param {string} markdownContent - The content of the markdown file
 * @returns {Array} - Array of section objects containing diagram information
 */
async function extractSections(markdownContent) {
  console.log("File length:", markdownContent.length);
  
  // Use a more flexible pattern to find diagram descriptions
  // This pattern will match "**Something Diagram:**" followed by text
  const diagramPattern = /\*\*([^*]+Diagram):\*\*([^\n]+)/g;
  
  const sections = [];
  let match;
  
  console.log("Searching for diagram descriptions...");
  console.log("First 100 characters of file:", markdownContent.substring(0, 100));
  
  // Test if the pattern works on a known diagram description
  const testString = "**Authentication Flow Diagram:** The diagram shows a sequence of steps";
  const testMatch = testString.match(/\*\*([^*]+Diagram):\*\*([^\n]+)/);
  console.log("Test match:", testMatch ? "Found" : "Not found");
  if (testMatch) {
    console.log("Test match:", testMatch[0]);
  }
  
  // Test with a sample from the actual file
  const sampleText = "**Agent Interface Diagram:** The diagram shows agent communication through contracts.";
  const sampleMatch = sampleText.match(/\*\*([^*]+Diagram):\*\*([^\n]+)/);
  console.log("Sample match:", sampleMatch ? "Found" : "Not found");
  if (sampleMatch) {
    console.log("Sample match:", sampleMatch[0]);
  }
  
  // Reset the regex state
  diagramPattern.lastIndex = 0;
  
  // Find all diagram descriptions
  while ((match = diagramPattern.exec(markdownContent)) !== null) {
    console.log(`Found match at position ${match.index}`);
    console.log(`Groups: "${match[1]}" | "${match[2]}"`);
    
    const diagramTitle = match[1].trim();
    const diagramDescription = match[2].trim();
    
    // Get surrounding context (500 characters before and after)
    const startPos = Math.max(0, match.index - 500);
    const endPos = Math.min(markdownContent.length, match.index + match[0].length + 500);
    const sectionContent = markdownContent.substring(startPos, endPos);
    console.log(`Section content: "${sectionContent.substring(0, 100)}..."`);
    console.log('Diagram Title:', diagramTitle);
    console.log('Diagram Description:', diagramDescription);
    sections.push({
      sectionContent: sectionContent,
      diagramTitle: diagramTitle,
      diagramDescription: diagramDescription,
      fullMatch: match[0],
      matchIndex: match.index
    });
  }
  
  if (sections.length === 0) {
    console.log("No diagram descriptions found. Check your markdown formatting.");
    
    // Additional debugging: Try to find any occurrences of "Diagram" in the text
    const simpleDiagramMatches = markdownContent.match(/Diagram/g);
    if (simpleDiagramMatches) {
      console.log(`Found ${simpleDiagramMatches.length} occurrences of the word "Diagram" in the text.`);
      
      // Try to find any occurrences of "**" followed by "Diagram" within 30 chars
      const starDiagramMatches = markdownContent.match(/\*\*[^*]{0,30}Diagram[^*]{0,30}\*\*/g);
      if (starDiagramMatches && starDiagramMatches.length > 0) {
        console.log(`Found ${starDiagramMatches.length} occurrences of "**" with "Diagram" inside.`);
        console.log("Examples:");
        starDiagramMatches.slice(0, 3).forEach(match => {
          console.log(`  - ${match}`);
        });
      }
    }
  } else {
    console.log(`Found ${sections.length} diagram descriptions.`);
  }
  
  return sections;
}

/**
 * Generates a Mermaid diagram using Claude AI
 * @param {Object} section - Section object containing diagram information
 * @returns {Object} - Section object with added mermaidCode property
 */
async function generateDiagramWithClaude(section) {
  if (!CLAUDE_API_KEY) {
    throw new Error("Claude API key is missing. Please set the CLAUDE_API_KEY environment variable.");
  }
  
  try {
    const prompt = `Can you create the requested diagram at the end of the paragraph that starts with "**${section.diagramTitle}**:" with Mermaid? 

Here's the description: "${section.diagramDescription}"

Context from the section:
${section.sectionContent.substring(0, 2000)}...

Please return ONLY a valid Mermaid diagram code block that visualizes this concept. The response should be structured as follows:
\`\`\`mermaid
// Your diagram code here
\`\`\`
`;

    console.log(`Sending prompt to Claude for "${section.diagramTitle}"...`);
    
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    console.log(`Received response from Claude for "${section.diagramTitle}"`);
    
    // Extract the mermaid code block from Claude's response
    const claudeResponse = response.data.content[0].text;
    console.log(`Claude response: "${claudeResponse.substring(0, 100)}..."`);
    
    const mermaidMatch = claudeResponse.match(/```mermaid\n([\s\S]*?)```/);
    
    if (mermaidMatch && mermaidMatch[1]) {
      console.log(`Found mermaid code: "${mermaidMatch[1].substring(0, 50)}..."`);
      return {
        ...section,
        mermaidCode: `\n\n\`\`\`mermaid\n${mermaidMatch[1].trim()}\n\`\`\`\n\n`
      };
    } else {
      console.error("Failed to extract mermaid code from Claude's response");
      return null;
    }
  } catch (error) {
    console.error("Error calling Claude API:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return null;
  }
}

/**
 * Inserts generated diagrams into the markdown content
 * @param {string} markdownContent - Original markdown content
 * @param {Array} diagramSections - Array of section objects with mermaidCode
 * @returns {string} - Updated markdown content with diagrams
 */
async function insertDiagramsIntoMarkdown(markdownContent, diagramSections) {
  let newContent = markdownContent;
  let offset = 0;
  
  console.log(`Inserting ${diagramSections.length} diagrams into markdown...`);
  
  // Sort sections by their position in the document (in reverse order to maintain indices)
  diagramSections.sort((a, b) => b.matchIndex - a.matchIndex);
  
  for (const section of diagramSections) {
    if (!section.mermaidCode) {
      console.log(`Skipping diagram "${section.diagramTitle}" because it has no mermaid code`);
      continue;
    }
    
    console.log(`Inserting diagram for "${section.diagramTitle}" at position ${section.matchIndex}`);
    
    // Find the end of the paragraph containing the diagram description
    const paragraphEnd = markdownContent.indexOf("\n\n", section.matchIndex);
    section.endIndex = paragraphEnd !== -1 ? paragraphEnd : markdownContent.length;
    
    // Use the endIndex directly as the insertion position
    const insertPosition = section.endIndex;
    
    if (insertPosition !== -1) {
      console.log(`Found insertion position at ${insertPosition}`);
      // Insert the mermaid diagram after the description paragraph
      newContent = newContent.slice(0, insertPosition + offset) + 
                  section.mermaidCode + 
                  newContent.slice(insertPosition + offset);
      
      offset += section.mermaidCode.length;
      console.log(`Updated offset to ${offset}`);
    } else {
      console.log(`Could not find insertion position for "${section.diagramTitle}"`);
    }
  }
  
  return newContent;
}

/**
 * Processes a markdown file to generate and insert diagrams
 * @param {string} filePath - Path to the markdown file
 * @returns {Promise<string|null>} - Path to the output file or null if no diagrams found
 */
async function processMdFile(filePath) {
  try {
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the markdown file
    const markdownContent = await fs.readFile(filePath, 'utf8');
    console.log("File length:", markdownContent.length);
    
    // Extract sections with diagram descriptions
    const sections = await extractSections(markdownContent);
    
    if (sections.length === 0) {
      console.log("No diagram sections found. Exiting.");
      return null;
    }
    
    // Generate diagrams for each section
    const diagramSections = [];
    for (const section of sections) {
      console.log(`Generating diagram for "${section.diagramTitle}"...`);
      const diagramSection = await generateDiagramWithClaude(section);
      if (diagramSection) {
        diagramSections.push(diagramSection);
      }
    }
    
    // Insert diagrams into the markdown
    const newContent = await insertDiagramsIntoMarkdown(markdownContent, diagramSections);
    
    // Write the updated markdown to a new file
    const outputPath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath, path.extname(filePath))}-with-diagrams${path.extname(filePath)}`
    );
    await fs.writeFile(outputPath, newContent);
    
    console.log(`Successfully processed file. Output saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("Error processing markdown file:", error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  if (process.argv.length < 3) {
    console.log("Usage: node diagram-generator.js <path-to-markdown-file>");
    process.exit(1);
  }
  
  const filePath = process.argv[2];
  processMdFile(filePath).catch(error => {
    console.error("Error:", error.message);
    process.exit(1);
  });
}

module.exports = {
  extractSections,
  generateDiagramWithClaude,
  insertDiagramsIntoMarkdown,
  processMdFile
};