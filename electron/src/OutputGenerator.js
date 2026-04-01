const fs = require('fs');
const path = require('path');
const TurndownService = require('turndown');

class OutputGenerator {
  constructor(outputDir, formatConfig) {
    this.outputDir = outputDir;
    this.formats = formatConfig;
    this.turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  }

  async generate(page) {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const baseName = `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (this.formats.pdf) {
      await page.pdf({
        path: path.join(this.outputDir, `${baseName}.pdf`),
        format: 'A4',
      });
    }

    if (this.formats.screenshot) {
      await page.screenshot({
        fullPage: true,
        type: 'png',
        path: path.join(this.outputDir, `${baseName}.png`),
      });
    }

    let htmlContent;
    if (this.formats.html || this.formats.markdown) {
      htmlContent = await page.content();
    }

    if (this.formats.html) {
      fs.writeFileSync(path.join(this.outputDir, `${baseName}.html`), htmlContent, 'utf-8');
    }

    if (this.formats.markdown) {
      const markdown = this.turndown.turndown(htmlContent);
      fs.writeFileSync(path.join(this.outputDir, `${baseName}.md`), markdown, 'utf-8');
    }
  }
}

module.exports = OutputGenerator;
