/** Public pages linked from Settings → About. */
export const PROJECT_REPO_URL = "https://github.com/ahmad-maqsood/skerry-island";
export const PROJECT_ISSUES_URL = "https://github.com/ahmad-maqsood/skerry-island/issues";
export const PROJECT_RELEASES_URL = "https://github.com/ahmad-maqsood/skerry-island/releases";
/** The newest release's page, with the GitHub installers. */
export const PROJECT_LATEST_RELEASE_URL = `${PROJECT_RELEASES_URL}/latest`;
export const PROJECT_NOTICE_URL = "https://github.com/ahmad-maqsood/skerry-island/blob/main/NOTICE.md";
export const PROJECT_PLUGIN_SPEC_URL = "https://github.com/ahmad-maqsood/skerry-island/blob/main/docs/plugins/README.md";
/** An installed plugin's user guide. Every plugin in `plugins/` has one (see docs/plugins/README.md). */
export const pluginGuideUrl = (id: string) => `${PROJECT_REPO_URL}/blob/main/docs/plugins/${id}.md`;
