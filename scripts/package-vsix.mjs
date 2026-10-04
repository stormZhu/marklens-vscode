import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))

const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vsix-stage-'))
const extDir = path.join(stageDir, 'extension')
fs.mkdirSync(extDir, { recursive: true })

// Copy package.json, README.md, dist/
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(extDir, 'package.json'))
fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(extDir, 'README.md'))
if (fs.existsSync(path.join(rootDir, 'CHANGELOG.md'))) {
  fs.copyFileSync(path.join(rootDir, 'CHANGELOG.md'), path.join(extDir, 'CHANGELOG.md'))
}
fs.cpSync(path.join(rootDir, 'dist'), path.join(extDir, 'dist'), { recursive: true })

// Write [Content_Types].xml
const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".css" ContentType="text/css"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>`
fs.writeFileSync(path.join(stageDir, '[Content_Types].xml'), contentTypesXml, 'utf-8')

// Write extension.vsixmanifest
const vsixManifest = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${pkg.name}" Version="${pkg.version}" Publisher="${pkg.publisher}" />
    <DisplayName>${pkg.displayName}</DisplayName>
    <Description xml:space="preserve">${pkg.description}</Description>
    <Tags>${(pkg.keywords || []).join(',')}</Tags>
    <Categories>${(pkg.categories || ['Other']).join(',')}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${pkg.engines.vscode}" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui,workspace" />
      <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true" />
  </Assets>
</PackageManifest>`
fs.writeFileSync(path.join(stageDir, 'extension.vsixmanifest'), vsixManifest, 'utf-8')

const outVsix = path.join(rootDir, `${pkg.name}-${pkg.version}.vsix`)
if (fs.existsSync(outVsix)) fs.unlinkSync(outVsix)

execFileSync('zip', ['-r', '-q', outVsix, '[Content_Types].xml', 'extension.vsixmanifest', 'extension'], {
  cwd: stageDir,
})

fs.rmSync(stageDir, { recursive: true, force: true })
console.log(`Packaged VSIX: ${outVsix}`)
