# Markdown to Diagram

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14.x-green.svg)](https://nodejs.org/)

A powerful tool that automatically generates Mermaid diagrams from markdown descriptions using Claude AI, and then converts those diagrams to images for better portability and sharing.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Using the npm command](#using-the-npm-command)
  - [Using the individual scripts](#using-the-individual-scripts)
- [How it works](#how-it-works)
- [Output files](#output-files)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- 🔍 Automatically extracts diagram descriptions from markdown files
- 🤖 Uses Claude AI to generate Mermaid diagrams based on the descriptions
- 📝 Inserts the generated diagrams into the markdown file
- 🖼️ Converts the Mermaid diagrams to PNG images
- 🔄 Replaces the Mermaid code with image references in the final markdown

## 🔧 Prerequisites

- Node.js (v14 or higher)
- npm
- Claude API key (set in a `.env` file)

## 📥 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/markdown-to-diagram.git
   cd markdown-to-diagram
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Claude API key:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   ```
   You can use the provided `.env.example` as a template.

## 🚀 Usage

### Using the npm command

The easiest way to use this tool is with the provided npm command:

```bash
npm run generate -- --f "path/to/your/markdown.md" --imageDir "path/to/image/directory"
```

Parameters:
- `--f` or `--file`: (Required) Path to the markdown file to process
- `--imageDir`: (Optional) Custom directory where the generated images should be saved. If not specified, images will be saved in a directory next to the markdown file.

Example:
```bash
npm run generate -- --f "docs/my-document.md" --imageDir "_assets/images"
```

> **Note:** The double dash (`--`) after `npm run generate` is important! It tells npm to pass the arguments to the script rather than interpreting them as npm arguments.

### Using the individual scripts

You can also run the scripts individually:

1. Generate diagrams and insert them into the markdown:
   ```bash
   node diagram-generator.js path/to/your/markdown.md
   ```

2. Convert the diagrams to images:
   ```bash
   node convert-diagrams-to-images.js path/to/your/markdown-with-diagrams.md [custom-image-directory]
   ```

## 🔄 How it works

1. The tool scans the markdown file for diagram titles in the format `**Title Diagram:**` or `**Title Diagram**:`
2. For each diagram title, it extracts the description that follows
3. It sends the description to Claude AI to generate a Mermaid diagram
4. The generated diagram is inserted into the markdown file after the description
5. The diagrams are then converted to PNG images using mermaid-cli
6. The Mermaid code in the markdown is replaced with image references

## 📁 Output files

The tool generates the following files:
- `original-filename-with-diagrams.md`: The markdown file with Mermaid diagrams inserted
- `original-filename-with-images.md`: The markdown file with image references instead of Mermaid code
- Image files in either the default directory (`original-filename-with-diagrams-images/`) or the custom directory specified with `--imageDir`

## 📂 Project Structure

```
markdown-to-diagram/
├── diagram-generator.js     # Generates Mermaid diagrams from markdown descriptions
├── convert-diagrams-to-images.js # Converts Mermaid diagrams to PNG images
├── generate-diagrams.js     # Main entry point that combines both steps
├── .env.example             # Example environment variables file
├── .gitignore               # Git ignore file
├── LICENSE                  # MIT License
├── package.json             # Project dependencies and scripts
└── README.md                # Project documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 