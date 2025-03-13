const fs = require('fs').promises;
const path = require('path');
const { processMdFile } = require('./diagram-generator');
const { convertDiagramsToImages } = require('./convert-diagrams-to-images');

async function generateDiagrams(markdownFile, imageDir) {
  try {
    console.log('=== Starting diagram generation and conversion process ===');
    console.log(`Input markdown file: ${markdownFile}`);
    console.log(`Image output directory: ${imageDir || 'Default (next to markdown file)'}`);
    
    // Step 1: Generate diagrams and insert them into the markdown
    console.log('\n=== Step 1: Generating diagrams with Claude ===');
    const outputPath = await processMdFile(markdownFile);
    
    // If no diagrams were found, exit gracefully
    if (!outputPath) {
      console.log('\n=== No diagrams found. Process completed. ===');
      return;
    }
    
    // Get the path of the generated markdown file with diagrams
    const dirName = path.dirname(markdownFile);
    const baseName = path.basename(markdownFile, path.extname(markdownFile));
    const markdownWithDiagrams = path.join(
      dirName,
      `${baseName}-with-diagrams${path.extname(markdownFile)}`
    );
    
    console.log(`\nGenerated markdown with diagrams: ${markdownWithDiagrams}`);
    
    // Step 2: Convert diagrams to images
    console.log('\n=== Step 2: Converting diagrams to images ===');
    
    // If imageDir is specified, we need to modify the convertDiagramsToImages function behavior
    if (imageDir) {
      // Read the markdown with diagrams
      const markdown = await fs.readFile(markdownWithDiagrams, 'utf8');
      
      // Create the image directory if it doesn't exist
      try {
        await fs.mkdir(imageDir, { recursive: true });
        console.log(`Created custom image directory: ${imageDir}`);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        } else {
          console.log(`Custom image directory already exists: ${imageDir}`);
        }
      }
      
      // Create a temporary file with the same content but modified to use the custom image directory
      const tempMarkdownPath = path.join(
        dirName,
        `${baseName}-temp${path.extname(markdownFile)}`
      );
      
      await fs.writeFile(tempMarkdownPath, markdown);
      
      // Convert diagrams to images using the temp file
      await convertDiagramsToImages(tempMarkdownPath, imageDir);
      
      // Clean up the temp file
      await fs.unlink(tempMarkdownPath);
      
      // Rename the output file to match the original naming convention
      const tempOutputPath = path.join(
        dirName,
        `${baseName}-temp-with-images${path.extname(markdownFile)}`
      );
      
      const finalOutputPath = path.join(
        dirName,
        `${baseName}-with-images${path.extname(markdownFile)}`
      );
      
      // Check if the temp output file exists before trying to rename it
      try {
        await fs.access(tempOutputPath);
        await fs.rename(tempOutputPath, finalOutputPath);
      } catch (err) {
        console.error(`Error renaming output file: ${err.message}`);
      }
    } else {
      // Use the default behavior
      await convertDiagramsToImages(markdownWithDiagrams);
    }
    
    console.log('\n=== Process completed successfully ===');
    console.log(`Final markdown with image references saved to: ${path.join(
      dirName,
      `${baseName}-with-images${path.extname(markdownFile)}`
    )}`);
    
  } catch (error) {
    console.error('Error in diagram generation process:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let markdownFile = null;
  let imageDir = null;
  
  // Check if args are being passed directly from npm run
  if (args.length === 2 && !args[0].startsWith('--') && !args[0].startsWith('-')) {
    // Direct arguments from command line (node generate-diagrams.js file.md imageDir)
    markdownFile = args[0];
    imageDir = args[1];
    return { markdownFile, imageDir };
  }
  
  // Parse named arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--f' || args[i] === '--file') {
      markdownFile = args[i + 1];
      i++;
    } else if (args[i] === '--imageDir' || args[i] === '-imageDir') {
      imageDir = args[i + 1];
      i++;
    }
  }
  
  if (!markdownFile) {
    console.error('Error: No markdown file specified. Use --f or --file to specify the input file.');
    process.exit(1);
  }
  
  return { markdownFile, imageDir };
}

// Main execution
if (require.main === module) {
  const { markdownFile, imageDir } = parseArgs();
  generateDiagrams(markdownFile, imageDir).catch(console.error);
}

module.exports = {
  generateDiagrams
}; 