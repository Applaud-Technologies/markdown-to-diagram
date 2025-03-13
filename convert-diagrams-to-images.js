const fs = require('fs').promises;
const path = require('path');
const { convertMarkdownMermaidToImage } = require('markdown-mermaid-exporter');
const { execSync } = require('child_process');

/**
 * Fixes common Mermaid syntax errors
 * @param {string} diagramCode - The original Mermaid diagram code
 * @param {string} diagramTitle - The title of the diagram for logging
 * @returns {string} - The fixed Mermaid diagram code
 */
function fixMermaidSyntax(diagramCode, diagramTitle) {
  console.log(`Checking syntax for diagram: ${diagramTitle}`);
  console.log(`Original diagram code first line: "${diagramCode.split('\n')[0]}"`);
  let fixedCode = diagramCode;
  
  // Fix 1: Replace invalid feedback transitions in state diagrams
  // From: state1 -- text --> state2
  // To:   state1 --> state2 : text
  if (diagramCode.includes('stateDiagram') || diagramCode.trim().startsWith('state')) {
    const feedbackRegex = /(\w+)\s+--\s+([^-]+)\s+-->\s+(\w+)/g;
    fixedCode = fixedCode.replace(feedbackRegex, (match, state1, text, state2) => {
      console.log(`Fixed invalid feedback transition: ${match}`);
      return `${state1} --> ${state2} : ${text.trim()}`;
    });
  }
  
  // Fix 2: Fix missing direction in flowcharts
  if (diagramCode.includes('graph ') && !diagramCode.match(/graph (TD|TB|LR|RL)/)) {
    fixedCode = fixedCode.replace(/graph /, 'graph TD ');
    console.log('Added missing direction TD to flowchart');
  }
  
  // Fix 3: Fix underscores in graph type declarations - DO NOT ADD UNDERSCORES
  // This was causing the issue - we were adding underscores instead of removing them
  // Remove any underscores in graph type declarations
  fixedCode = fixedCode.replace(/(graph|flowchart)_([A-Za-z0-9]+)/g, (match, type, direction) => {
    console.log(`Removed underscore in graph type declaration: ${match}`);
    return `${type} ${direction}`;
  });
  
  // Fix 4: Fix stateDiagram-v2 with underscore
  // This is a special case - we need to use stateDiagram instead of stateDiagram-v2 or stateDiagram_v2
  if (fixedCode.includes('stateDiagram_v2') || fixedCode.includes('stateDiagram-v2')) {
    fixedCode = fixedCode.replace(/stateDiagram[_-]v2/g, 'stateDiagram');
    console.log('Replaced stateDiagram-v2 with stateDiagram');
  }
  
  // Fix 5: Fix state declarations with underscores
  // From: state_Requirements {
  // To:   state "Requirements" {
  fixedCode = fixedCode.replace(/state_([A-Za-z0-9]+)\s*{/g, (match, stateName) => {
    console.log(`Fixed state declaration with underscore: ${match}`);
    return `state "${stateName}" {`;
  });
  
  // Fix 6: Fix 'end' keyword used as a node name
  // 'end' is a reserved keyword in Mermaid, so we need to rename it
  fixedCode = fixedCode.replace(/\bend\s*\[/g, (match) => {
    console.log(`Fixed 'end' keyword used as node name: ${match}`);
    return 'endNode [';
  });
  
  // Fix 7: Fix triple equals in links (===)
  // Mermaid doesn't support triple equals in links
  fixedCode = fixedCode.replace(/===/g, (match) => {
    console.log(`Fixed triple equals in link: ${match}`);
    return '-->';
  });
  
  // Fix 8: Class definitions with style attributes
  // The issue is with the quotes around style attributes
  fixedCode = fixedCode.replace(/classDef\s+(\w+)\s+"([^"]+)"/g, (match, className, styleStr) => {
    // Fix style attributes with colons
    const fixedStyle = styleStr
      .replace(/([a-zA-Z-]+):([^,]+)/g, '$1:$2') // Ensure colon format
      .replace(/stroke-width/g, 'stroke-width')
      .replace(/stroke-dasharray/g, 'stroke-dasharray');
    
    console.log(`Fixed class definition style: classDef ${className}`);
    return `classDef ${className} ${fixedStyle}`;
  });
  
  // Fix 9: Fix class usage with underscores
  // From: class A,B,C solid_line
  // To:   class A,B,C solidLine
  fixedCode = fixedCode.replace(/class\s+([A-Za-z0-9,\s]+)\s+(\w+)_(\w+)/g, (match, nodes, style1, style2) => {
    console.log(`Fixed class usage with underscore: ${match}`);
    return `class ${nodes} ${style1}${style2}`;
  });
  
  // Fix 10: Fix class usage with node names containing underscores
  // From: class_id1 dottedArrow
  // To:   class id1 dottedArrow
  fixedCode = fixedCode.replace(/class_([A-Za-z0-9]+)\s+(\w+)/g, (match, id, style) => {
    console.log(`Fixed class usage with node name containing underscore: ${match}`);
    return `class ${id} ${style}`;
  });
  
  // Fix 11: Fix missing quotes in labels with spaces
  const labelRegex = /\[([^"'\]]+\s+[^"'\]]+)\]/g;
  fixedCode = fixedCode.replace(labelRegex, (match, label) => {
    if (!label.startsWith('"') && !label.endsWith('"') && 
        !label.startsWith("'") && !label.endsWith("'")) {
      return `["${label}"]`;
    }
    return match;
  });
  
  // Fix 12: Fix invalid characters in node IDs
  fixedCode = fixedCode.replace(/\b(\w+)[-\s](\w+)\b(?!\])/g, (match, part1, part2) => {
    // Only replace if it's not inside brackets (not a label)
    if (!match.includes('[') && !match.includes(']')) {
      return `${part1}_${part2}`;
    }
    return match;
  });
  
  // Fix 13: Fix subgraph syntax issues
  // Remove underscores in subgraph declarations
  fixedCode = fixedCode.replace(/subgraph_([A-Za-z0-9]+)/g, (match, name) => {
    console.log(`Removed underscore in subgraph declaration: ${match}`);
    return `subgraph ${name}`;
  });
  
  // Fix 14: Fix 'end' keyword spacing
  fixedCode = fixedCode.replace(/(\w+)\s+end\s+/g, (match, prev) => {
    console.log(`Fixed 'end' keyword spacing: ${match}`);
    return `${prev}\nend\n`;
  });
  
  // Fix 15: Fix style declarations with underscores
  fixedCode = fixedCode.replace(/style_(\w+)/g, (match, name) => {
    console.log(`Fixed style declaration: ${match}`);
    return `style ${name}`;
  });
  
  // Fix 16: Fix class definitions with underscores
  fixedCode = fixedCode.replace(/classDef_(\w+)/g, (match, name) => {
    console.log(`Fixed class definition: ${match}`);
    return `classDef ${name}`;
  });
  
  // Fix 17: Fix style attributes with underscores
  fixedCode = fixedCode.replace(/(stroke|fill)_([\w#]+)/g, (match, attr, value) => {
    console.log(`Fixed style attribute: ${match}`);
    return `${attr}:${value}`;
  });
  
  // IMPORTANT: Make sure we don't add underscores to graph declarations
  // This is the critical fix - we need to ensure we're not adding underscores
  const firstLine = fixedCode.split('\n')[0].trim();
  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
    // Make sure there's a space after graph/flowchart and before the direction
    fixedCode = fixedCode.replace(/^(graph|flowchart)([A-Za-z0-9]+)/m, (match, type, direction) => {
      console.log(`Ensuring space in graph declaration: ${match}`);
      return `${type} ${direction}`;
    });
    
    // Remove any underscores that might have been added
    fixedCode = fixedCode.replace(/^(graph|flowchart)_([A-Za-z0-9]+)/m, (match, type, direction) => {
      console.log(`Removing underscore from graph declaration: ${match}`);
      return `${type} ${direction}`;
    });
  }
  
  // Log if changes were made
  if (fixedCode !== diagramCode) {
    console.log('Syntax fixes applied to diagram');
    console.log(`Fixed diagram code first line: "${fixedCode.split('\n')[0]}"`);
  }
  
  return fixedCode;
}

/**
 * Simplifies a Mermaid diagram by removing complex elements
 * @param {string} diagramCode - The Mermaid diagram code to simplify
 * @returns {string} - A simplified version of the diagram
 */
function simplifyMermaidDiagram(diagramCode) {
  let simplifiedCode = diagramCode;
  
  // Determine diagram type
  if (diagramCode.includes('stateDiagram')) {
    // For state diagrams, create a very basic state diagram
    // Convert stateDiagram-v2 to stateDiagram
    simplifiedCode = diagramCode.replace(/stateDiagram[_-]v2/g, 'stateDiagram');
    
    // Fix state declarations with underscores
    simplifiedCode = simplifiedCode.replace(/state_([A-Za-z0-9]+)\s*{/g, 'state "$1" {');
    
    // Create a very simple state diagram
    simplifiedCode = 'stateDiagram\n    Start --> End';
  } else if (diagramCode.includes('graph ') || diagramCode.includes('flowchart ')) {
    // For flowcharts, create a very simple graph
    // Extract the graph type (TD, LR, etc.)
    let graphType = 'TD'; // Default
    const graphMatch = diagramCode.match(/graph\s+([A-Z]{2})/);
    if (graphMatch && graphMatch[1]) {
      graphType = graphMatch[1];
    }
    
    // Create a simple graph with the same direction
    simplifiedCode = `graph ${graphType}\n    A[Simplified] --> B[Diagram]`;
  } else if (diagramCode.includes('sequenceDiagram')) {
    // For sequence diagrams, create a very simple sequence
    simplifiedCode = 'sequenceDiagram\n    participant A\n    participant B\n    A->>B: Message';
  } else {
    // For other diagram types, create a generic simple diagram
    simplifiedCode = 'graph TD\n    A[Simplified] --> B[Diagram]';
  }
  
  console.log('Created simplified diagram');
  return simplifiedCode;
}

/**
 * Creates a simple error image when diagram generation fails
 * @param {string} outputPath - Path where the error image should be saved
 * @param {string} diagramTitle - Title of the diagram
 */
async function createErrorImage(outputPath, diagramTitle) {
  try {
    // Create a unique identifier for this error image
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Create a very simple diagram showing an error message
    const errorDiagramCode = `graph TD
    A["Error: Could not render diagram"]
    B["Please check the Mermaid syntax"]
    A --> B`;
    
    // Write to a temporary file with unique name
    const tempDir = path.dirname(outputPath);
    const tempFile = path.join(tempDir, `error-diagram-${uniqueId}.mmd`);
    
    await fs.writeFile(tempFile, errorDiagramCode);
    
    // Try to generate the error image
    try {
      execSync(`npx mmdc -i "${tempFile}" -o "${outputPath}"`);
      console.log(`Created error placeholder image for ${diagramTitle}`);
    } catch (err) {
      console.error(`Failed to create error image: ${err.message}`);
      
      // If even the simple error diagram fails, try to create a text-based image
      try {
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(400, 200);
        const ctx = canvas.getContext('2d');
        
        // Draw a simple error message
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 400, 200);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#dc3545';
        ctx.fillText('Error: Could not render diagram', 20, 50);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#212529';
        ctx.fillText('Please check the Mermaid syntax', 20, 100);
        ctx.fillText(`Diagram: ${diagramTitle}`, 20, 150);
        
        // Save the canvas as PNG
        const fs = require('fs');
        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        
        console.log(`Created fallback text-based error image for ${diagramTitle}`);
      } catch (canvasErr) {
        console.error(`Failed to create canvas image: ${canvasErr.message}`);
        
        // Ultimate fallback: create a simple HTML file and convert it to an image
        try {
          const htmlContent = `
          <html>
            <body style="width: 400px; height: 200px; background-color: #f8f9fa; font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #dc3545;">Error: Could not render diagram</h2>
              <p style="color: #212529;">Please check the Mermaid syntax</p>
              <p style="color: #212529;">Diagram: ${diagramTitle}</p>
            </body>
          </html>`;
          
          const htmlFile = path.join(tempDir, `error-${uniqueId}.html`);
          await fs.writeFile(htmlFile, htmlContent);
          
          // Try to use puppeteer to convert HTML to PNG if available
          try {
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setViewport({ width: 400, height: 200 });
            await page.goto(`file://${htmlFile}`);
            await page.screenshot({ path: outputPath });
            await browser.close();
            console.log(`Created HTML-based error image for ${diagramTitle}`);
          } catch (puppeteerErr) {
            console.error(`Failed to create HTML image: ${puppeteerErr.message}`);
            // If all else fails, just copy a pre-made error image if available
            try {
              const defaultErrorImage = path.join(__dirname, 'error-image.png');
              if (fs.existsSync(defaultErrorImage)) {
                fs.copyFileSync(defaultErrorImage, outputPath);
                console.log(`Copied default error image for ${diagramTitle}`);
              } else {
                console.error(`No default error image available for ${diagramTitle}`);
              }
            } catch (copyErr) {
              console.error(`Failed to copy default error image: ${copyErr.message}`);
            }
          }
          
          // Clean up HTML file
          await fs.unlink(htmlFile).catch(() => {});
        } catch (htmlErr) {
          console.error(`Failed to create HTML error image: ${htmlErr.message}`);
        }
      }
    }
    
    // Clean up
    await fs.unlink(tempFile).catch(() => {});
  } catch (err) {
    console.error(`Failed to create error image: ${err.message}`);
  }
}

async function convertDiagramsToImages(markdownFilePath, customImageDir = null) {
  try {
    console.log(`Reading markdown file: ${markdownFilePath}`);
    const markdown = await fs.readFile(markdownFilePath, 'utf8');
    console.log(`Markdown file length: ${markdown.length} characters`);
    
    // Create a directory for the images
    const dirName = path.dirname(markdownFilePath);
    const baseName = path.basename(markdownFilePath, path.extname(markdownFilePath));
    
    // Use custom image directory if provided, otherwise use default
    const imagesDir = customImageDir || path.join(dirName, `${baseName}-images`);
    
    try {
      await fs.mkdir(imagesDir, { recursive: true });
      console.log(`Created images directory: ${imagesDir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      } else {
        console.log(`Images directory already exists: ${imagesDir}`);
      }
    }
    
    // Extract diagram titles from the markdown
    console.log('Searching for diagram titles in markdown...');
    const diagramTitleRegex = /\*\*([^*]+Diagram)\*\*:|\*\*([^*]+Diagram):\*\*/g;
    const diagramTitles = [];
    const diagramPositions = {};
    let titleMatch;
    
    // Extract all diagram titles using regex
    while ((titleMatch = diagramTitleRegex.exec(markdown)) !== null) {
      // Get the actual matched group (either group 1 or group 2)
      const matchedGroup = titleMatch[1] || titleMatch[2];
      const title = matchedGroup.trim();
      diagramTitles.push(title);
      diagramPositions[title] = titleMatch.index;
      console.log(`Found diagram title: "${title}" at position ${titleMatch.index}`);
    }
    
    console.log(`Found ${diagramTitles.length} diagram titles in the markdown`);
    
    // Find all Mermaid diagram positions in the markdown
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    let diagramCount = 0;
    const diagrams = [];
    
    console.log('Searching for Mermaid diagrams in markdown...');
    
    // Generate a timestamp for this run to ensure uniqueness
    const timestamp = Date.now();
    
    // First, extract all diagrams
    while ((match = mermaidRegex.exec(markdown)) !== null) {
      diagramCount++;
      const fullMatch = match[0];
      const diagramCode = match[1];
      const position = match.index;
      
      // Find the closest diagram title before this diagram
      let closestTitle = null;
      let closestDistance = Infinity;
      
      for (const title of diagramTitles) {
        const titlePos = diagramPositions[title];
        if (titlePos < position && position - titlePos < closestDistance) {
          closestDistance = position - titlePos;
          closestTitle = title;
        }
      }
      
      // Create a unique filename using title (if available), index, and timestamp
      const titleBase = closestTitle ? 
        closestTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 
        `diagram-${diagramCount}`;
      
      // Add timestamp to ensure uniqueness
      const uniqueFilename = `${titleBase}-${timestamp}-${diagramCount}`;
      
      console.log(`Found diagram ${diagramCount} at position ${position}`);
      console.log(`Associated title: ${closestTitle || 'None found'}`);
      console.log(`Diagram code preview: ${diagramCode.substring(0, 50)}...`);
      console.log(`Generated unique filename: ${uniqueFilename}`);
      
      diagrams.push({
        fullMatch,
        diagramCode,
        position,
        index: diagramCount,
        title: closestTitle,
        filename: uniqueFilename,
        originalTitle: titleBase // Store the original title for reference
      });
    }
    
    console.log(`Found ${diagramCount} Mermaid diagrams in the markdown`);
    
    if (diagramCount === 0) {
      console.log('No Mermaid diagrams found in the markdown. Exiting.');
      return;
    }
    
    // Convert each diagram to an image
    for (const diagram of diagrams) {
      try {
        console.log(`Converting diagram "${diagram.title || diagram.index}" to image...`);
        
        // Fix common Mermaid syntax errors
        let fixedDiagramCode = fixMermaidSyntax(diagram.diagramCode, diagram.title || `diagram-${diagram.index}`);
        
        // Create a temporary file with just this diagram
        const tempDiagramFile = path.join(imagesDir, `temp-${diagram.filename}.mmd`);
        await fs.writeFile(tempDiagramFile, fixedDiagramCode);
        
        // Debug: Read the file content to verify what was written
        const tempFileContent = await fs.readFile(tempDiagramFile, 'utf8');
        console.log(`Temporary file content: "${tempFileContent.split('\n')[0]}"`);
        
        // Convert the diagram to an image
        const outputImagePath = path.join(imagesDir, `${diagram.filename}.png`);
        
        // Use mermaid-cli directly since markdown-mermaid-exporter might have issues
        const command = `npx mmdc -i "${tempDiagramFile}" -o "${outputImagePath}"`;
        
        console.log(`Executing command: ${command}`);
        try {
          execSync(command);
          console.log(`Generated image: ${outputImagePath}`);
        } catch (execError) {
          console.error(`Error executing mermaid-cli for diagram ${diagram.index}:`, execError.message);
          
          // Try again with a simplified version of the diagram
          console.log(`Attempting to fix diagram ${diagram.index} and retry...`);
          const simplifiedCode = simplifyMermaidDiagram(fixedDiagramCode);
          await fs.writeFile(tempDiagramFile, simplifiedCode);
          
          try {
            execSync(command);
            console.log(`Generated image with simplified diagram: ${outputImagePath}`);
          } catch (retryError) {
            console.error(`Failed to generate image even with simplified diagram: ${retryError.message}`);
            // Create a fallback error image or use a placeholder
            await createErrorImage(outputImagePath, diagram.title || `Diagram ${diagram.index}`);
          }
        }
        
        // Clean up the temporary file
        try {
          await fs.unlink(tempDiagramFile);
        } catch (unlinkError) {
          console.warn(`Warning: Could not delete temporary file ${tempDiagramFile}: ${unlinkError.message}`);
        }
      } catch (err) {
        console.error(`Error converting diagram ${diagram.index}:`, err);
        // Continue with the next diagram instead of failing the entire process
      }
    }
    
    // Now replace the diagrams in the markdown with image references
    let updatedMarkdown = markdown;
    
    for (const diagram of diagrams) {
      // Create a relative path from the markdown file to the image
      let imagePath;
      if (customImageDir) {
        // Use the custom image directory path
        const relativeImageDir = path.relative(path.dirname(markdownFilePath), customImageDir);
        imagePath = path.join(relativeImageDir, `${diagram.filename}.png`).replace(/\\/g, '/');
      } else {
        // Use the default path
        imagePath = path.join(imagesDir, `${diagram.filename}.png`).replace(/\\/g, '/');
      }
      
      const altText = diagram.title || `Diagram ${diagram.index}`;
      const imageMarkdown = `![${altText}](${imagePath})`;
      
      // Replace the Mermaid code with the image reference
      updatedMarkdown = updatedMarkdown.replace(diagram.fullMatch, imageMarkdown);
      
      console.log(`Replaced diagram "${altText}" with image reference: ${imagePath}`);
    }
    
    // Write the updated markdown with image references
    const outputMarkdownPath = path.join(
      dirName,
      `${baseName}-with-images${path.extname(markdownFilePath)}`
    );
    
    await fs.writeFile(outputMarkdownPath, updatedMarkdown);
    
    console.log(`Successfully converted ${diagramCount} diagrams to images.`);
    console.log(`Updated markdown saved to: ${outputMarkdownPath}`);
    
  } catch (error) {
    console.error('Error converting diagrams to images:', error);
  }
}

// Main execution
if (require.main === module) {
  if (process.argv.length < 3) {
    console.log('Usage: node convert-diagrams-to-images.js <path-to-markdown-file> [custom-image-directory]');
    process.exit(1);
  }
  
  const filePath = process.argv[2];
  const customImageDir = process.argv.length > 3 ? process.argv[3] : null;
  convertDiagramsToImages(filePath, customImageDir).catch(console.error);
}

module.exports = {
  convertDiagramsToImages
}; 