const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'index.html');
const xlsxSource = path.join(root, 'vendor', 'xlsx.full.min.js');
const argon2Source = path.join(root, 'vendor', 'argon2-bundled.min.js');
const jszipSource = path.join(root, 'vendor', 'jszip.min.js');
const echartsSource = path.join(root, 'vendor', 'echarts.min.js');
const cwbCollectionsSource = path.join(root, 'src', 'core', 'cwb-collections.js');
const v4RuntimeSource = path.join(root, 'src', 'core', 'v4-runtime.js');
const v8MigrationSource = path.join(root, 'src', 'core', 'v8-migration.js');
const v8WorkspaceRuntimeSource = path.join(root, 'src', 'core', 'v8-workspace-runtime.js');
const v8PersistenceProtocolSource = path.join(root, 'src', 'core', 'v8-persistence-protocol.js');
const v8BackupCodecSource = path.join(root, 'src', 'core', 'v8-backup-codec.js');
const cwbAiSource = path.join(root, 'src', 'core', 'cwb-ai.js');
const cwbAiWorkflowSource = path.join(root, 'src', 'core', 'cwb-ai-workflow.js');
const cwbEmploymentSource = path.join(root, 'src', 'core', 'cwb-employment.js');
const cwbEmploymentResourcesSource = path.join(root, 'src', 'core', 'cwb-employment-resources.js');
const cwbBusinessSource = path.join(root, 'src', 'core', 'cwb-business.js');
const cwbSupabaseSource = path.join(root, 'src', 'core', 'cwb-supabase.js');
const importWorkerSource = path.join(root, 'src', 'core', 'import-worker.js');
const welcomeEducationSceneSource = path.join(root, 'assets', 'welcome-education-scene-v2.png');
const welcomeMorningSceneSource = path.join(root, 'assets', 'welcome-morning.png');
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'output', '辅导员工作台.html');

fs.mkdirSync(path.dirname(target), { recursive:true });
const html = fs.readFileSync(source, 'utf8');
// SheetJS carries legacy code-page tables as raw bytes. A base64 data script
// retains those bytes exactly and keeps the HTML parser out of the source.
const xlsxBytes = fs.readFileSync(xlsxSource);
const xlsx = xlsxBytes.toString('utf8');
const xlsxDataUrl = `data:application/javascript;base64,${xlsxBytes.toString('base64')}`;
const argon2 = fs.readFileSync(argon2Source, 'utf8');
const jszip = fs.readFileSync(jszipSource, 'utf8');
const echarts = fs.readFileSync(echartsSource, 'utf8');
const cwbCollections = fs.readFileSync(cwbCollectionsSource, 'utf8');
const v4Runtime = fs.readFileSync(v4RuntimeSource, 'utf8');
const v8Migration = fs.readFileSync(v8MigrationSource, 'utf8');
const v8WorkspaceRuntime = fs.readFileSync(v8WorkspaceRuntimeSource, 'utf8');
const v8PersistenceProtocol = fs.readFileSync(v8PersistenceProtocolSource, 'utf8');
const v8BackupCodec = fs.readFileSync(v8BackupCodecSource, 'utf8');
const cwbAi = fs.readFileSync(cwbAiSource, 'utf8');
const cwbAiWorkflow = fs.readFileSync(cwbAiWorkflowSource, 'utf8');
const cwbEmployment = fs.readFileSync(cwbEmploymentSource, 'utf8');
const cwbEmploymentResources = fs.readFileSync(cwbEmploymentResourcesSource, 'utf8');
const cwbBusiness = fs.readFileSync(cwbBusinessSource, 'utf8');
const cwbSupabase = fs.readFileSync(cwbSupabaseSource, 'utf8');
const importWorker = fs.readFileSync(importWorkerSource, 'utf8').replace('/*__XLSX_SOURCE__*/', xlsx);
const portableWelcomeAssets = {
  'welcome-education-scene-v2.png': `data:image/png;base64,${fs.readFileSync(welcomeEducationSceneSource).toString('base64')}`,
  'welcome-morning.png': `data:image/png;base64,${fs.readFileSync(welcomeMorningSceneSource).toString('base64')}`
};
const portable = html.replace(/<script defer src="vendor\/xlsx\.full\.min\.js" data-offline-xlsx><\/script>/,
  () => `<script data-offline-xlsx src="${xlsxDataUrl}"></script>`)
  .replace(/<script data-cwb-collections>[\s\S]*?<\/script>/,
    () => `<script data-cwb-collections>\n${cwbCollections}\n</script>`)
  .replace(/<script defer src="vendor\/argon2-bundled\.min\.js" data-offline-argon2><\/script>/,
    () => `<script data-offline-argon2>\n${argon2}\n</script>`)
  .replace(/<script defer src="vendor\/jszip\.min\.js" data-offline-jszip><\/script>/,
    () => `<script data-offline-jszip>\n${jszip}\n</script>`)
  .replace(/<script defer src="vendor\/echarts\.min\.js" data-offline-echarts><\/script>/,
    () => `<script data-offline-echarts>\n${echarts}\n</script>`)
  .replace(/<script defer src="src\/core\/v4-runtime\.js" data-v4-runtime><\/script>/,
    () => `<script data-v4-runtime>\n${v4Runtime}\n</script>`)
  .replace(/<script defer src="src\/core\/v8-migration\.js" data-v8-migration><\/script>/,
    () => `<script data-v8-migration>\n${v8Migration}\n</script>`)
  .replace(/<script defer src="src\/core\/v8-persistence-protocol\.js" data-v8-persistence><\/script>/,
    () => `<script data-v8-persistence>\n${v8PersistenceProtocol}\n</script>`)
  .replace(/<script defer src="src\/core\/v8-workspace-runtime\.js" data-v8-runtime><\/script>/,
    () => `<script data-v8-runtime>\n${v8WorkspaceRuntime}\n</script>`)
  .replace(/<script defer src="src\/core\/v8-backup-codec\.js" data-v8-backup-codec><\/script>/,
    () => `<script data-v8-backup-codec>\n${v8BackupCodec}\n</script>`)
  .replace(/<script defer src="src\/core\/cwb-ai\.js" data-cwb-ai><\/script>/,
    () => `<script data-cwb-ai>\n${cwbAi}\n</script>`)
  .replace(/<script defer src="src\/core\/cwb-ai-workflow\.js" data-cwb-ai-workflow><\/script>/,
    () => `<script data-cwb-ai-workflow>\n${cwbAiWorkflow}\n</script>`)
  .replace(/<script defer src="src\/core\/cwb-employment\.js" data-cwb-employment><\/script>/,
    () => `<script data-cwb-employment>\n${cwbEmployment}\n</script>`)
  .replace(/<script defer src="src\/core\/cwb-employment-resources\.js" data-cwb-employment-resources><\/script>/,
    () => `<script data-cwb-employment-resources>\n${cwbEmploymentResources}\n</script>`)
  .replace(/<script defer src="src\/core\/cwb-business\.js" data-cwb-business><\/script>/,
    () => `<script data-cwb-business>\n${cwbBusiness}\n</script>`)
  .replace(/<script defer src="src\/core\/cwb-supabase\.js" data-cwb-supabase><\/script>/,
    () => `<script data-cwb-supabase>\n${cwbSupabase}\n</script>`)
  .replace(/<script type="text\/plain" id="cwb-import-worker-source" data-cwb-import-worker><\/script>/,
    () => `<script type="text/plain" id="cwb-import-worker-source" data-cwb-import-worker>${importWorker.replace(/<\//g, '<\\/')}</script>`)
  .replace('</head>', () => `<script>window.__CWB_PORTABLE_ASSETS__=${JSON.stringify(portableWelcomeAssets).replace(/<\//g, '<\\/')}</script></head>`);
if (portable === html) throw new Error('Offline Excel placeholder was not found in index.html');
if (portable.includes('src/core/v4-runtime.js')) throw new Error('v4 runtime was not inlined');
if (portable.includes('src/core/cwb-collections.js')) throw new Error('collection manifest was not inlined');
if (portable.includes('src/core/v8-migration.js')) throw new Error('v8 migration runtime was not inlined');
if (portable.includes('src/core/v8-workspace-runtime.js')) throw new Error('v8 workspace runtime was not inlined');
if (portable.includes('src/core/v8-persistence-protocol.js')) throw new Error('v8 persistence protocol was not inlined');
if (portable.includes('src/core/v8-backup-codec.js')) throw new Error('v8 backup codec was not inlined');
if (portable.includes('src/core/cwb-ai.js')) throw new Error('AI governance runtime was not inlined');
if (portable.includes('src/core/cwb-ai-workflow.js')) throw new Error('AI workflow runtime was not inlined');
if (portable.includes('src/core/cwb-employment.js')) throw new Error('Employment runtime was not inlined');
if (portable.includes('src/core/cwb-employment-resources.js')) throw new Error('Employment resources runtime was not inlined');
if (portable.includes('src/core/cwb-business.js')) throw new Error('Business runtime was not inlined');
if (portable.includes('src/core/cwb-supabase.js')) throw new Error('Supabase sync runtime was not inlined');
if (portable.includes('vendor/argon2-bundled.min.js')) throw new Error('Argon2 runtime was not inlined');
if (portable.includes('vendor/jszip.min.js')) throw new Error('JSZip runtime was not inlined');
if (portable.includes('vendor/echarts.min.js')) throw new Error('ECharts runtime was not inlined');
if (!portable.includes('data-cwb-import-worker')) throw new Error('Import worker was not embedded');
fs.writeFileSync(target, portable, 'utf8');
console.log(`Release file created: ${target}`);
